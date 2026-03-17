import express from 'express';
import fs from 'fs/promises';
import { requireAuth } from '../middleware/auth.js';
import { ImportRecord, ImportRecordItem } from '../models/index.js';
import { success } from '../utils/response.js';
import { Op } from 'sequelize';

const router = express.Router();

/** 获取用户的导入记录列表 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20, status } = req.query;

    const where = { user_id: userId };
    if (status) where.status = status;

    const offset = (Number(page) - 1) * Number(pageSize);

    const { count, rows } = await ImportRecord.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    res.json(success({
      list: rows,
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    }));
  } catch (e) {
    next(e);
  }
});

/** 获取单个导入记录详情 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const record = await ImportRecord.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json(success(record));
  } catch (e) {
    next(e);
  }
});

/** 创建导入记录 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      file_name,
      requirements_count,
      projects_count,
      target_project_id,
      target_project_name,
    } = req.body;

    const record = await ImportRecord.create({
      id: require('crypto').randomUUID(),
      user_id: userId,
      file_name,
      requirements_count,
      projects_count: projects_count || 0,
      target_project_id,
      target_project_name,
      status: 'analyzed',
    });

    res.json(success(record, '记录创建成功'));
  } catch (e) {
    next(e);
  }
});

/** 更新导入记录状态 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const record = await ImportRecord.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    const { imported_count, failed_count, status, error_message } = req.body;

    await record.update({
      ...(imported_count !== undefined && { imported_count }),
      ...(failed_count !== undefined && { failed_count }),
      ...(status && { status }),
      ...(error_message !== undefined && { error_message }),
    });

    res.json(success(record, '更新成功'));
  } catch (e) {
    next(e);
  }
});

/** 删除导入记录 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const record = await ImportRecord.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    // 删除关联的原需求文档文件
    if (record.original_file_path) {
      await fs.unlink(record.original_file_path).catch(() => {
        // 文件不存在或删除失败，忽略错误
      });
    }

    // 级联删除会自动删除关联的 ImportRecordItem
    await record.destroy();
    res.json(success(null, '删除成功'));
  } catch (e) {
    next(e);
  }
});

/** 获取导入记录的工作项明细列表 */
router.get('/:id/items', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 50, status } = req.query;

    // 先验证记录是否属于当前用户
    const record = await ImportRecord.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    // 构建查询条件
    const where = { record_id: req.params.id };
    if (status) where.status = status;

    const offset = (Number(page) - 1) * Number(pageSize);

    const { count, rows } = await ImportRecordItem.findAndCountAll({
      where,
      order: [['createdAt', 'ASC']],
      limit: Number(pageSize),
      offset,
    });

    res.json(success({
      list: rows,
      total: count,
      page: Number(page),
      pageSize: Number(pageSize),
    }));
  } catch (e) {
    next(e);
  }
});

/** 获取原需求文档内容 */
router.get('/:id/content', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 先验证记录是否属于当前用户
    const record = await ImportRecord.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    if (!record.original_file_path) {
      return res.status(404).json({ 
        success: false, 
        error: '原需求文档不存在（可能是旧版本记录）' 
      });
    }

    // 读取文件内容
    let content = '';
    try {
      content = await fs.readFile(record.original_file_path, 'utf-8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ 
          success: false, 
          error: '原需求文档文件已被删除' 
        });
      }
      throw err;
    }

    res.json(success({
      content,
      file_name: record.file_name,
      file_path: record.original_file_path,
    }));
  } catch (e) {
    next(e);
  }
});

/** 从导入记录恢复分析结果（返回工作项列表，用于继续编辑和导入） */
router.get('/:id/restore', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const record = await ImportRecord.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    const items = await ImportRecordItem.findAll({
      where: { record_id: record.id },
      order: [['createdAt', 'ASC']],
    });

    const requirements = items.map(item => ({
      id: item.id,
      project_name: item.project_name || record.target_project_name || '',
      title: item.title,
      description: item.description || '',
      priority: 'Medium',
      estimated_hours: 8,
      start_at: new Date().toISOString(),
      type_id: item.type_id || 'story',
      status: item.status === 'success' ? 'imported' : 'new',
    }));

    res.json(success({
      requirements,
      record_id: record.id,
      file_name: record.file_name,
      target_project_id: record.target_project_id,
      target_project_name: record.target_project_name,
    }, '恢复成功'));
  } catch (e) {
    next(e);
  }
});

export default router;
