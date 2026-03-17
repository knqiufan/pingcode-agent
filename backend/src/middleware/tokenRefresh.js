import { refreshAccessToken } from '../services/pingcode.js';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * 中间件：在需要 PingCode API 的路由前检查并自动刷新过期 token
 * 仅当 req.user 存在且 token 即将/已经过期时触发刷新
 */
export async function ensureFreshToken(req, res, next) {
  try {
    const user = req.user;
    if (!user || !user.access_token || !user.expires_at) {
      return next();
    }

    const expiresAt = new Date(user.expires_at).getTime();
    const now = Date.now();

    if (now < expiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return next();
    }

    if (!user.refresh_token || !user.pingcode_client_id || !user.pingcode_client_secret) {
      return next();
    }

    console.log(`[TokenRefresh] Token 即将过期，正在为用户 ${user.id} 刷新...`);
    const tokenData = await refreshAccessToken(
      user.refresh_token,
      user.pingcode_client_id,
      user.pingcode_client_secret
    );

    const { access_token, refresh_token, expires_in } = tokenData;
    await user.update({
      access_token,
      refresh_token: refresh_token || user.refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000),
    });

    req.user = user;
    console.log(`[TokenRefresh] 用户 ${user.id} Token 刷新成功`);
    next();
  } catch (e) {
    console.error('[TokenRefresh] Token 刷新失败:', e.message);
    next();
  }
}
