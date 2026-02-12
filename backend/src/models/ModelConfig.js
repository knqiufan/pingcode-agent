import { DataTypes } from 'sequelize';
import { sequelize } from '../services/db.js';

export const ModelConfig = sequelize.define('ModelConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '配置名称，如 "DeepSeek Chat", "GPT-4"',
  },
  provider: {
    type: DataTypes.ENUM('openai', 'anthropic'),
    allowNull: false,
    comment: 'API 提供商',
  },
  api_key: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'API 密钥',
  },
  base_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'API 基础 URL',
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '模型名称，如 "deepseek-chat", "gpt-4"',
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    comment: '温度参数，控制随机性',
  },
  max_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最大生成 tokens 数',
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为默认配置',
  },
}, {
  tableName: 'model_configs',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'name'],
    },
  ],
});
