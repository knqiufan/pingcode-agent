import { User, Role, UserRole } from '../models/index.js';

/**
 * 检查用户是否为 admin 的中间件
 */
export async function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未登录' });
    }

    // 检查用户是否有 admin 角色
    const userRoles = await UserRole.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Role, where: { name: 'admin' } }],
    });

    if (userRoles.length === 0) {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }

    // 将 admin 标记添加到 req 对象
    req.isAdmin = true;
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * 检查用户是否有指定权限的中间件
 * @param {string} permissionName - 权限名称
 */
export function requirePermission(permissionName) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: '未登录' });
      }

      // admin 有所有权限
      const adminRole = await UserRole.findOne({
        where: { user_id: req.user.id },
        include: [{ model: Role, where: { name: 'admin' } }],
      });

      if (adminRole) {
        return next();
      }

      // 检查用户是否有指定权限
      // TODO: 实现基于资源的权限检查
      next();
    } catch (e) {
      next(e);
    }
  };
}
