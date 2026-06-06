const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Land = require('../models/Land');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// 认证接口速率限制：每个 IP 每分钟最多 10 次请求
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/register
 * 注册
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, nickname, password } = req.body;

    // 参数校验
    if (!username || !nickname || !password) {
      return res.json({ code: 400, message: '账号、昵称和密码不能为空' });
    }
    if (username.length < 3 || username.length > 20) {
      return res.json({ code: 400, message: '账号长度为 3-20 个字符' });
    }
    if (nickname.length < 2 || nickname.length > 16) {
      return res.json({ code: 400, message: '昵称长度为 2-16 个字符' });
    }
    if (password.length < 6) {
      return res.json({ code: 400, message: '密码长度至少 6 位' });
    }

    // 检查账号唯一性
    const existUsername = await User.findByUsername(username);
    if (existUsername) {
      return res.json({ code: 409, message: '该账号已被注册' });
    }

    // 检查昵称唯一性
    const existNickname = await User.findByNickname(nickname);
    if (existNickname) {
      return res.json({ code: 409, message: '该昵称已被使用' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const userId = await User.create({ username, nickname, password: hashedPassword });

    // 初始化12块土地
    await Land.initLands(userId);

    // 生成 token
    const token = jwt.sign(
      { id: userId, username, nickname },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      code: 200,
      message: '注册成功',
      data: {
        token,
        user: { id: userId, username, nickname, gold: 3000, level: 1, experience: 0 },
      },
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/auth/login
 * 登录
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ code: 400, message: '账号和密码不能为空' });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.json({ code: 404, message: '账号不存在' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.json({ code: 401, message: '密码错误' });
    }

    // 更新最后登录时间
    await User.updateLastLogin(user.id);

    // 生成 token
    const token = jwt.sign(
      { id: user.id, username: user.username, nickname: user.nickname },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          gold: user.gold,
          level: user.level,
          experience: user.experience,
        },
      },
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/auth/profile
 * 获取当前用户信息（需登录）
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }
    res.json({ code: 200, data: user });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
