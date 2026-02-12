import { DataTypes } from 'sequelize';
import { sequelize } from '../services/db.js';

export const ImportRecord = sequelize.define('ImportRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '原始文件名',
  },
  requirements_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '解析出的需求数量',
  },
  projects_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '涉及的项目数量',
  },
  target_project_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '目标项目ID',
  },
  target_project_name: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '目标项目名称',
  },
  imported_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '实际导入的工作项数量',
  },
  failed_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '导入失败的工作项数量',
  },
  status: {
    type: DataTypes.ENUM('analyzed', 'importing', 'success', 'partial_success', 'failed'),
    defaultValue: 'analyzed',
    comment: '导入状态',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息',
  },
}, {
  tableName: 'import_records',
  timestamps: true,
});
