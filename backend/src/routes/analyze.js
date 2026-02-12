import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { parseFile } from '../services/parser.js';
import { analyzeRequirements } from '../services/agent.js';
import { ImportRecord } from '../models/index.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

/** 上传文件并分析需求 */
router.post('/analyze', requireAuth, upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '请上传文件' });
  }

  const filePath = req.file.path;

  try {
    const text = await parseFile(filePath, req.file.originalname);

    // 清理临时文件
    await fs.unlink(filePath).catch(() => {});

    const requirements = await analyzeRequirements(text, req.user.id);

    // 为每条需求添加唯一 ID
    const data = requirements.map((item) => ({
      ...item,
      id: uuidv4(),
      status: 'new',
    }));

    // 创建导入记录
    const uniqueProjectNames = [...new Set(requirements.map(r => r.project_name))];
    const record = await ImportRecord.create({
      id: uuidv4(),
      user_id: req.user.id,
      file_name: req.file.originalname,
      requirements_count: requirements.length,
      projects_count: uniqueProjectNames.length,
      status: 'analyzed',
    });

    // 在响应中返回记录ID
    res.json({ success: true, data, record_id: record.id });
  } catch (e) {
    // 确保临时文件被清理
    await fs.unlink(filePath).catch(() => {});
    next(e);
  }
});

export default router;
