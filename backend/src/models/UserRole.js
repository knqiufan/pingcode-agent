import { DataTypes } from 'sequelize';
import { sequelize } from '../services/db.js';

export const UserRole = sequelize.define('UserRole', {
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    comment: '用户ID',
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    comment: '角色ID',
  },
}, {
  tableName: 'user_roles',
  timestamps: true,
});
