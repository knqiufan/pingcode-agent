import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ModelConfig } from '../models/index.js';
import { success } from '../utils/response.js';
import { testModelConnection } from '../services/agent.js';

const router = express.Router();

/** 获取用户的所有模型配置 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const configs = await ModelConfig.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
    });
    res.json(success(configs));
  } catch (e) {
    next(e);
  }
});

/** 获取默认模型配置 */
router.get('/default', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const config = await ModelConfig.findOne({
      where: { user_id: userId, is_default: true },
    });

    if (!config) {
      // 如果没有默认配置，返回第一个配置
      const firstConfig = await ModelConfig.findOne({
        where: { user_id: userId },
        order: [['createdAt', 'ASC']],
      });
      return res.json(success(firstConfig));
    }

    res.json(success(config));
  } catch (e) {
    next(e);
  }
});

/** 获取单个模型配置 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const config = await ModelConfig.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    res.json(success(config));
  } catch (e) {
    next(e);
  }
});

/** 测试模型连接 */
router.post('/:id/test', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const config = await ModelConfig.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    await testModelConnection({
      provider: config.provider,
      api_key: config.api_key,
      base_url: config.base_url,
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.max_tokens,
    });

    res.json(success(null, '连接成功'));
  } catch (e) {
    const message = e.message || '连接失败';
    return res.status(400).json({ success: false, error: message });
  }
});

/** 创建模型配置 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, provider, api_key, base_url, model, temperature, max_tokens, is_default } = req.body;

    // 验证必填字段
    if (!name || !provider || !api_key || !model) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    // 验证 provider
    if (!['openai', 'anthropic'].includes(provider)) {
      return res.status(400).json({ success: false, error: '不支持的提供商' });
    }

    // 如果设置为默认，取消其他配置的默认状态
    if (is_default) {
      await ModelConfig.update(
        { is_default: false },
        { where: { user_id: userId } }
      );
    }

    const config = await ModelConfig.create({
      id: require('crypto').randomUUID(),
      user_id: userId,
      name,
      provider,
      api_key,
      base_url: base_url || null,
      model,
      temperature: temperature || 0,
      max_tokens: max_tokens || null,
      is_default: is_default || false,
    });

    res.json(success(config, '创建成功'));
  } catch (e) {
    next(e);
  }
});

/** 更新模型配置 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const config = await ModelConfig.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    const { name, provider, api_key, base_url, model, temperature, max_tokens, is_default } = req.body;

    // 验证 provider
    if (provider && !['openai', 'anthropic'].includes(provider)) {
      return res.status(400).json({ success: false, error: '不支持的提供商' });
    }

    // 如果设置为默认，取消其他配置的默认状态
    if (is_default) {
      await ModelConfig.update(
        { is_default: false },
        { where: { user_id: userId, id: { [require('sequelize').Op.ne]: req.params.id } } }
      );
    }

    await config.update({
      ...(name && { name }),
      ...(provider && { provider }),
      ...(api_key && { api_key }),
      ...(base_url !== undefined && { base_url }),
      ...(model && { model }),
      ...(temperature !== undefined && { temperature }),
      ...(max_tokens !== undefined && { max_tokens }),
      ...(is_default !== undefined && { is_default }),
    });

    res.json(success(config, '更新成功'));
  } catch (e) {
    next(e);
  }
});

/** 删除模型配置 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const config = await ModelConfig.findOne({
      where: { id: req.params.id, user_id: userId },
    });

    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    await config.destroy();
    res.json(success(null, '删除成功'));
  } catch (e) {
    next(e);
  }
});

export default router;
