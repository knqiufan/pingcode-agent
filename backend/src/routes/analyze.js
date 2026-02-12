import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { parseFile } from '../services/parser.js';
import { analyzeRequirements } from '../services/agent.js';
import { ImportRecord, ImportRecordItem } from '../models/index.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * 解码文件名（处理 UTF-8 编码的中文文件名）
 * Multer 使用 busboy 解析 multipart，originalname 可能是 Latin1 编码
 */
function decodeFileName(originalname) {
  try {
    // 尝试将 Latin1 编码的字符串转换为 UTF-8
    const decoded = Buffer.from(originalname, 'latin1').toString('utf8');
    // 检查解码后是否为有效的 UTF-8 字符串
    if (decoded && !decoded.includes('\ufffd')) {
      return decoded;
    }
    return originalname;
  } catch {
    return originalname;
  }
}

/**
 * 生成安全的文件名（移除不允许的字符）
 */
function sanitizeFileName(fileName) {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

/** 上传文件并分析需求 */
router.post('/analyze', requireAuth, upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '请上传文件' });
  }

  const filePath = req.file.path;
  // 解码文件名，修复中文乱码问题
  const fileName = decodeFileName(req.file.originalname);

  try {
    const text = await parseFile(filePath, fileName);

    // 清理临时文件
    await fs.unlink(filePath).catch(() => {});

    // 保存原需求文档到 uploads/demand 目录
    const timestamp = Date.now();
    const safeFileName = sanitizeFileName(path.basename(fileName, path.extname(fileName)));
    const demandDir = 'uploads/demand';
    const demandFilePath = `${demandDir}/${safeFileName}-${timestamp}.txt`;
    
    await fs.mkdir(demandDir, { recursive: true });
    await fs.writeFile(demandFilePath, text, 'utf-8');

    const requirements = await analyzeRequirements(text, req.user.id);

    // 为每条需求添加唯一 ID
    const data = requirements.map((item) => ({
      ...item,
      id: uuidv4(),
      status: 'new',
    }));

    // 创建导入记录
    const uniqueProjectNames = [...new Set(requirements.map(r => r.project_name))];
    const recordId = uuidv4();
    const record = await ImportRecord.create({
      id: recordId,
      user_id: req.user.id,
      file_name: fileName,
      original_file_path: demandFilePath,
      requirements_count: requirements.length,
      projects_count: uniqueProjectNames.length,
      status: 'analyzed',
    });

    // 批量创建导入明细记录
    if (data.length > 0) {
      const recordItems = data.map((item) => ({
        id: item.id,
        record_id: recordId,
        title: item.title || '',
        description: item.description || '',
        project_name: item.project_name || '',
        type_id: item.type_id || '',
        priority_id: item.priority_id || '',
        status: 'pending',
      }));
      await ImportRecordItem.bulkCreate(recordItems);
    }

    // 在响应中返回记录ID
    res.json({ success: true, data, record_id: record.id });
  } catch (e) {
    // 确保临时文件被清理
    await fs.unlink(filePath).catch(() => {});
    next(e);
  }
});

export default router;
