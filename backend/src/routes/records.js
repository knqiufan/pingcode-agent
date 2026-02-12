import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ImportRecord } from '../models/index.js';
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

    await record.destroy();
    res.json(success(null, '删除成功'));
  } catch (e) {
    next(e);
  }
});

export default router;
