import { DataTypes } from 'sequelize';
import { sequelize } from '../services/db.js';

export const RolePermission = sequelize.define('RolePermission', {
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    comment: '角色ID',
  },
  permission_id: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    comment: '权限ID',
  },
}, {
  tableName: 'role_permissions',
  timestamps: true,
});
