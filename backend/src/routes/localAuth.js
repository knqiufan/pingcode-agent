import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Role, UserRole } from '../models/index.js';
import { appConfig } from '../config/index.js';
import { success } from '../utils/response.js';
import { withRetry } from '../utils/retry.js';

const router = express.Router();

/** 注册 */
router.post('/register', async (req, res, next) => {
  const { username, password, email } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password_hash: hashedPassword,
      pingcode_email: email,
    });

    // 为新用户分配默认角色
    const defaultRole = await Role.findOne({ where: { name: 'user' } });
    if (defaultRole) {
      await UserRole.create({
        user_id: user.id,
        role_id: defaultRole.id,
      });
    }

    res.json(success({ id: user.id, username: user.username }, '注册成功'));
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }
    next(e);
  }
});

/** 登录 */
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
  }

  try {
    const findUser = () => User.findOne({ where: { username } });
    const user = await withRetry(findUser, {
      maxRetries: 2,
      baseDelay: 500,
      label: 'Login',
    });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' });
    }

    // 获取用户角色
    const userRoles = await UserRole.findAll({
      where: { user_id: user.id },
      include: [Role],
    });

    const roles = userRoles.map(ur => ur.Role.name);
    const isAdmin = roles.includes('admin');

    const token = jwt.sign(
      { id: user.id, username: user.username, roles, isAdmin },
      appConfig.jwt.secret,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        roles,
        isAdmin,
      }
    });
  } catch (e) {
    next(e);
  }
});

export default router;
