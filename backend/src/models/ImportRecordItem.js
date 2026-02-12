import { DataTypes } from 'sequelize';
import { sequelize } from '../services/db.js';

export const ImportRecordItem = sequelize.define('ImportRecordItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  record_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '关联的导入记录ID',
  },
  title: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '工作项标题',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '工作项描述',
  },
  project_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '原始项目名称（AI识别）',
  },
  type_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '工作项类型ID',
  },
  priority_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '优先级ID',
  },
  pingcode_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '导入后的 PingCode 工作项ID',
  },
  pingcode_identifier: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '导入后的 PingCode 工作项标识符（如 WI-123）',
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'skipped'),
    defaultValue: 'pending',
    comment: '导入状态：pending-待导入, success-成功, failed-失败, skipped-跳过',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '导入失败的错误信息',
  },
}, {
  tableName: 'import_record_items',
  timestamps: true,
  indexes: [
    {
      fields: ['record_id'],
    },
    {
      fields: ['status'],
    },
  ],
});
