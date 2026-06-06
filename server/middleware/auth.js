const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT 认证中间件
 */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录，请先登录' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // { id, username, nickname }
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'Token 无效或已过期，请重新登录' });
  }
}

module.exports = auth;
