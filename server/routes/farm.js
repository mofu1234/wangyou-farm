const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const rateLimit = require('express-rate-limit');

// 认证接口速率限制：每个 IP 每分钟最多 10 次请求
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});
// ===== 活动系统 =====
/**
 * GET /api/farm/events
 * 获取当前有效活动
 */
router.get('/events', async (req, res) => {
  try {
    const [events] = await db.execute(
      `SELECT * FROM server_events WHERE is_active=1 AND NOW() BETWEEN start_time AND end_time`
    );
    res.json({ code: 200, data: events });
  } catch (err) {
    console.error('获取活动失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});


const Land = require('../models/Land');
const Bag = require('../models/Bag');
const Warehouse = require('../models/Warehouse');
const CropConfig = require('../models/CropConfig');
const User = require('../models/User');
const StealRecord = require('../models/StealRecord');
const auth = require('../middleware/auth');
const db = require('../config/db');

/**
 * GET /api/farm/lands
 * 获取所有土地状态
 */
router.get('/lands', auth, async (req, res) => {
  try {
    const lands = await Land.findByUserId(req.user.id);
    res.json({ code: 200, data: lands });
  } catch (err) {
    console.error('获取土地失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/farm/plant
 * 播种
 * body: { landIndex, cropId }
 */
router.post('/plant', auth, async (req, res) => {
  try {
    const { landIndex, cropId } = req.body;

    if (!landIndex || landIndex < 1 || landIndex > 12) {
      return res.json({ code: 400, message: '土地编号无效（1-12）' });
    }
    if (!cropId) {
      return res.json({ code: 400, message: '请选择作物' });
    }

    // 检查土地状态
    const land = await Land.findByUserAndIndex(req.user.id, landIndex);
    if (!land) {
      return res.json({ code: 404, message: '土地不存在' });
    }
    if (land.status !== 'empty') {
      return res.json({ code: 400, message: '该土地已有作物，请先收获或清除' });
    }

    // 检查背包种子
    const db = require('../config/db');
    const [bagRows] = await db.execute(
      'SELECT quantity FROM bags WHERE user_id = ? AND crop_id = ? AND quantity > 0',
      [req.user.id, cropId]
    );
    if (!bagRows.length) {
      return res.json({ code: 400, message: '背包中没有该作物的种子，请先购买' });
    }

    // 扣除种子 & 播种
    await Bag.consume(req.user.id, cropId, 1);
    await Land.plant(req.user.id, landIndex, cropId);

    res.json({ code: 200, message: '播种成功' });
  } catch (err) {
    console.error('播种失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/farm/water
 * 浇水
 * body: { landIndex }
 */
router.post('/water', auth, async (req, res) => {
  try {
    const { landIndex } = req.body;

    if (!landIndex || landIndex < 1 || landIndex > 12) {
      return res.json({ code: 400, message: '土地编号无效' });
    }

    const land = await Land.findByUserAndIndex(req.user.id, landIndex);
    if (!land) {
      return res.json({ code: 404, message: '土地不存在' });
    }
    if (land.status === 'empty') {
      return res.json({ code: 400, message: '空地不能浇水' });
    }
    if (land.status === 'mature') {
      return res.json({ code: 400, message: '作物已成熟，请收获' });
    }

    await Land.water(req.user.id, landIndex);

    res.json({ code: 200, message: '浇水成功' });
  } catch (err) {
    console.error('浇水失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/farm/harvest
 * 收获
 * body: { landIndex }
 */
router.post('/harvest', auth, async (req, res) => {
  try {
    const { landIndex } = req.body;

    if (!landIndex || landIndex < 1 || landIndex > 12) {
      return res.json({ code: 400, message: '土地编号无效' });
    }

    const land = await Land.findByUserAndIndex(req.user.id, landIndex);
    if (!land) {
      return res.json({ code: 404, message: '土地不存在' });
    }
    if (land.status === 'empty') {
      return res.json({ code: 400, message: '土地是空的' });
    }

    // 获取作物配置
    const crop = await CropConfig.findById(land.crop_id);
    if (!crop) {
      return res.json({ code: 400, message: '作物配置不存在' });
    }

    // 检查是否已成熟（根据种植时间计算）
    const plantedAt = new Date(String(land.planted_at).includes('T')?land.planted_at:String(land.planted_at).replace(' ','T')+'Z').getTime();
    const now = Date.now();
    const waterBonus = land.watered_at ? 0.3 : 0;
    
    // 查询活动加成
    const [events] = await db.execute(
      'SELECT bonus FROM server_events WHERE is_active=1 AND NOW() BETWEEN start_time AND end_time'
    );
    let eventBonus = 0;
    events.forEach(e => { eventBonus += e.bonus; });
    eventBonus = Math.min(eventBonus, 0.8);  // 最高80%加速
    
    const effectiveTime = crop.growth_time * 1000 * (1 - waterBonus) * (1 - eventBonus);
    const elapsed = now - plantedAt;
    if (elapsed < effectiveTime) {
      const remaining = Math.ceil((effectiveTime - elapsed) / 1000);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      return res.json({ code: 400, message: `作物尚未成熟，还需 ${mins}分${secs}秒` });
    }

    // 随机收获数量 1-10
    const harvestQty = Math.floor(Math.random() * 10) + 1;
    const totalExp = crop.experience * harvestQty;
    
    // 收获入仓库 & 清理土地 & 增加经验（不加金币，卖了才加钱）
    await Warehouse.add(req.user.id, land.crop_id, harvestQty);
    await Land.harvest(req.user.id, landIndex);
    await User.addExperience(req.user.id, totalExp);

    res.json({
      code: 200,
      message: `收获 ${crop.name} x${harvestQty}！⭐+${totalExp}`,
      data: { experience: totalExp, quantity: harvestQty },
    });
  } catch (err) {
    console.error('收获失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/farm/remove
 * 拔掉作物（清除）
 * body: { landIndex }
 */
router.post('/remove', auth, async (req, res) => {
  try {
    const { landIndex } = req.body;

    if (!landIndex || landIndex < 1 || landIndex > 12) {
      return res.json({ code: 400, message: '土地编号无效' });
    }

    const land = await Land.findByUserAndIndex(req.user.id, landIndex);
    if (!land) {
      return res.json({ code: 404, message: '土地不存在' });
    }
    if (land.status === 'empty') {
      return res.json({ code: 400, message: '土地已经是空地' });
    }

    await Land.remove(req.user.id, landIndex);

    res.json({ code: 200, message: '已清除作物' });
  } catch (err) {
    console.error('清除作物失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/farm/bag
 * 获取背包
 */
router.get('/bag', auth, async (req, res) => {
  try {
    const items = await Bag.findByUserId(req.user.id);
    res.json({ code: 200, data: items });
  } catch (err) {
    console.error('获取背包失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * GET /api/farm/warehouse
 * 获取仓库
 */
router.get('/warehouse', auth, async (req, res) => {
  try {
    const items = await Warehouse.findByUserId(req.user.id);
    res.json({ code: 200, data: items });
  } catch (err) {
    console.error('获取仓库失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;

// ===== 财富排行榜 =====
router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, nickname, gold, level, experience FROM users ORDER BY gold DESC LIMIT 20'
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('获取排行榜失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// ===== 好友系统 =====
router.post('/friends/add', auth, async (req, res) => {
  try {
    const { nickname, friendId: fid } = req.body;
    let friendId;
    if (fid) {
      friendId = fid;
      if (friendId === req.user.id) return res.json({ code: 400, message: '不能加自己' });
      const [u] = await db.execute('SELECT id FROM users WHERE id = ?', [friendId]);
      if (!u.length) return res.json({ code: 404, message: '用户不存在' });
    } else if (nickname) {
      if (nickname === req.user.nickname) return res.json({ code: 400, message: '不能加自己' });
      const [users] = await db.execute('SELECT id FROM users WHERE nickname = ?', [nickname]);
      if (!users.length) return res.json({ code: 404, message: '用户不存在' });
      friendId = users[0].id;
    } else {
      return res.json({ code: 400, message: '请输入昵称或用户ID' });
    }
    await db.execute(
      'INSERT IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
      [req.user.id, friendId, 'pending']
    );
    res.json({ code: 200, message: '好友请求已发送' });
  } catch (err) {
    console.error('添加好友失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/friends/accept', auth, async (req, res) => {
  try {
    const { friendId } = req.body;
    await db.execute(
      'UPDATE friends SET status = ? WHERE user_id = ? AND friend_id = ? AND status = ?',
      ['accepted', friendId, req.user.id, 'pending']
    );
    // 互相关注
    await db.execute(
      'INSERT IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)',
      [req.user.id, friendId, 'accepted']
    );
    res.json({ code: 200, message: '已接受好友' });
  } catch (err) {
    console.error('接受好友失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/friends/reject', auth, async (req, res) => {
  try {
    const { friendId } = req.body;
    await db.execute(
      'DELETE FROM friends WHERE user_id = ? AND friend_id = ? AND status = ?',
      [friendId, req.user.id, 'pending']
    );
    res.json({ code: 200, message: '已拒绝' });
  } catch (err) {
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.delete('/friends/remove', auth, async (req, res) => {
  try {
    const { friendId } = req.body;
    await db.execute(
      'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [req.user.id, friendId, friendId, req.user.id]
    );
    res.json({ code: 200, message: '已删除好友' });
  } catch (err) {
    res.json({ code: 500, message: '服务器错误' });
  }
});


// ===== 搜索用户 =====
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json({ code: 200, data: [] });
    const [users] = await db.execute(
      'SELECT id, nickname, gold, level FROM users WHERE nickname LIKE ? AND id != ? LIMIT 10',
      ['%' + q + '%', req.user.id]
    );
    // 检查好友关系
    const uid = req.user.id;
    for (let u of users) {
      const [fr] = await db.execute(
        'SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
        [uid, u.id, u.id, uid]
      );
      u.friendStatus = fr.length ? fr[0].status : 'none';
    }
    res.json({ code: 200, data: users });
  } catch (err) {
    console.error('搜索用户失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.get('/friends/list', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    // 好友列表（UNION去重）
    const [friends] = await db.execute(`
      SELECT u.id, u.nickname, u.gold, u.level
      FROM friends f JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'accepted'
      UNION
      SELECT u.id, u.nickname, u.gold, u.level
      FROM friends f JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'accepted'
    `, [uid, uid]);
    // 收到的好友请求
    const [requests] = await db.execute(`
      SELECT u.id, u.nickname, u.gold, u.level
      FROM friends f JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
    `, [uid]);
    res.json({ code: 200, data: { friends, requests } });
  } catch (err) {
    console.error('获取好友列表失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// ===== 访问好友农场 =====
router.get('/visit/:userId', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const [user] = await db.execute(
      'SELECT id, nickname, gold, level, experience FROM users WHERE id = ?', [userId]
    );
    if (!user.length) return res.json({ code: 404, message: '用户不存在' });
    const lands = await Land.findByUserId(userId);
    const stealRecords = await StealRecord.findByVictimAndStealer(userId, req.user.id);
    const stolenLandIndices = stealRecords.map(r => r.land_index);
    res.json({ code: 200, data: { user: user[0], lands, stolenLandIndices } });
  } catch (err) {
    console.error('访问农场失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// ===== 偷菜 =====
router.post('/steal', auth, async (req, res) => {
  try {
    const { victimId, landIndex } = req.body;
    if (!victimId || !landIndex) {
      return res.json({ code: 400, message: '参数不完整' });
    }
    if (victimId === req.user.id) {
      return res.json({ code: 400, message: '不能偷自己的菜' });
    }
    // 检查是否已偷过
    const alreadyStolen = await StealRecord.hasStolen(req.user.id, victimId, landIndex);
    if (alreadyStolen) {
      return res.json({ code: 400, message: '这块地已经偷过了' });
    }
    // 检查好友这块地的作物
    const land = await Land.findByUserAndIndex(victimId, landIndex);
    if (!land || land.status === 'empty' || !land.crop_id) {
      return res.json({ code: 400, message: '这块地没有作物' });
    }
    // 检查作物是否成熟
    const crop = await CropConfig.findById(land.crop_id);
    if (!crop) {
      return res.json({ code: 400, message: '作物配置不存在' });
    }
    const plantedAt = new Date(String(land.planted_at).includes('T') ? land.planted_at : String(land.planted_at).replace(' ', 'T') + 'Z').getTime();
    const waterBonus = land.watered_at ? 0.3 : 0;
    const effectiveTime = crop.growth_time * 1000 * (1 - waterBonus);
    const elapsed = Date.now() - plantedAt;
    if (elapsed < effectiveTime) {
      return res.json({ code: 400, message: '作物还没成熟，不能偷' });
    }
    // 随机偷 0-5 个
    const quantity = Math.floor(Math.random() * 6);
    if (quantity === 0) {
      // 偷了0个也要记录，防止重试
      await StealRecord.create({
        stealerId: req.user.id,
        victimId,
        landIndex,
        cropId: land.crop_id,
        quantity: 0
      });
      return res.json({ code: 200, message: '运气不好，没偷到东西 😅', data: { quantity: 0 } });
    }
    // 放入自己仓库
    await Warehouse.add(req.user.id, land.crop_id, quantity);
    // 记录偷菜
    await StealRecord.create({
      stealerId: req.user.id,
      victimId,
      landIndex,
      cropId: land.crop_id,
      quantity
    });
    res.json({
      code: 200,
      message: `偷到 ${crop.name} x${quantity}！🎉`,
      data: { quantity, cropName: crop.name }
    });
  } catch (err) {
    console.error('偷菜失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});



// ===== 管理员后台API =====

// 管理员认证中间件（使用 JWT 验证）
const adminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: '管理员未登录' });
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (!decoded.isAdmin) {
      return res.status(401).json({ code: 401, message: '权限不足' });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'Token 无效或已过期' });
  }
};

// 管理员登录（使用 bcrypt 验证 + JWT 签发）
router.post('/admin/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ code: 400, message: '账号和密码不能为空' });
    }
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminHash = process.env.ADMIN_PASSWORD_HASH;
    if (!adminHash || username !== adminUser) {
      return res.json({ code: 401, message: '账号或密码错误' });
    }
    const valid = await bcrypt.compare(password, adminHash);
    if (!valid) {
      return res.json({ code: 401, message: '账号或密码错误' });
    }
    const token = jwt.sign(
      { id: 0, username: adminUser, isAdmin: true },
      config.jwt.secret,
      { expiresIn: '24h' }
    );
    res.json({ code: 200, message: '登录成功', data: { token } });
  } catch (err) {
    console.error('管理员登录失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// 搜索玩家
router.get('/admin/search-player', adminAuth, async (req, res) => {
  try {
    const { q } = req.query;
    const [rows] = await db.execute(
      'SELECT id, nickname, username FROM users WHERE nickname LIKE ? OR username LIKE ? LIMIT 10',
      [`%${q}%`, `%${q}%`]
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('搜索玩家失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// 获取作物列表
router.get('/admin/crops', adminAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, name, category, seed_icon, stage3_icon FROM crop_configs ORDER BY category, id');
    res.json({ code: 200, data: rows });
  } catch (err) {
    res.json({ code: 500, message: '服务器错误' });
  }
});

// 发送邮件
router.post('/admin/send-email', adminAuth, async (req, res) => {
  try {
    const { userId, title, content, type, items } = req.body;
    if (!userId || !title) {
      return res.json({ code: 400, message: '缺少参数' });
    }
    const emailId = await Email.create({ userId, title, content, type: type || 'reward', items });
    res.json({ code: 200, message: '发送成功', data: { emailId } });
  } catch (err) {
    console.error('发送邮件失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// ===== 邮件系统 =====
const Email = require('../models/Email');
const Announcement = require('../models/Announcement');

router.get('/emails', auth, async (req, res) => {
  try {
    const emails = await Email.findByUserId(req.user.id);
    res.json({ code: 200, data: emails });
  } catch (err) {
    console.error('获取邮件失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/emails/read', auth, async (req, res) => {
  try {
    const { emailId } = req.body;
    const email = await Email.findById(emailId);
    if (!email || email.user_id !== req.user.id) {
      return res.json({ code: 404, message: '邮件不存在' });
    }
    await Email.markAsRead(emailId);
    res.json({ code: 200, message: '已标记已读' });
  } catch (err) {
    console.error('标记已读失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.delete('/emails/delete', auth, async (req, res) => {
  try {
    const { emailId } = req.body;
    const email = await Email.findById(emailId);
    if (!email || email.user_id !== req.user.id) {
      return res.json({ code: 404, message: '邮件不存在' });
    }
    await Email.delete(emailId);
    res.json({ code: 200, message: '邮件已删除' });
  } catch (err) {
    console.error('删除邮件失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/emails/send', auth, async (req, res) => {
  try {
    const { userId, title, content, type, items } = req.body;
    if (!userId || !title) {
      return res.json({ code: 400, message: '缺少参数' });
    }
    const emailId = await Email.create({ userId, title, content, type, items });
    res.json({ code: 200, message: '邮件发送成功', data: { emailId } });
  } catch (err) {
    console.error('发送邮件失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});


/**
 * POST /api/farm/emails/claim
 * 领取邮件附件
 */
router.post('/emails/claim', auth, async (req, res) => {
  try {
    const { emailId } = req.body;
    if (!emailId) {
      return res.json({ code: 400, message: '缺少参数' });
    }
    
    const email = await Email.findById(emailId);
    if (!email) {
      return res.json({ code: 404, message: '邮件不存在' });
    }
    if (email.user_id !== req.user.id) {
      return res.json({ code: 403, message: '无权操作' });
    }
    if (email.claimed) {
      return res.json({ code: 400, message: '已领取过' });
    }
    
    if (email.items) {
      const items = typeof email.items === 'string' ? JSON.parse(email.items) : email.items;
      for (const item of items) {
        // 根据type判断：seed放背包，crop放仓库，gold加金币
        if (item.type === 'gold') {
          await db.execute('UPDATE users SET gold = gold + ? WHERE id = ?', [item.amount || item.quantity, req.user.id]);
        } else if (item.type === 'seed') {
          await Bag.add(req.user.id, item.cropId, item.quantity);
        } else if (item.type === 'crop') {
          await Warehouse.add(req.user.id, item.cropId, item.quantity);
        } else {
          // 默认：根据分类判断
          const crop = await CropConfig.findById(item.cropId);
          if (crop && (crop.category === '水果' || crop.category === '蔬菜')) {
            await Warehouse.add(req.user.id, item.cropId, item.quantity);
          } else {
            await Bag.add(req.user.id, item.cropId, item.quantity);
          }
        }
      }
    }
    
    await Email.markClaimed(emailId);
    await Email.delete(emailId);
    res.json({ code: 200, message: '领取成功！邮件已删除' });
  } catch (err) {
    console.error('领取邮件失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// ===== 公告系统 =====
router.get('/announcements', auth, async (req, res) => {
  try {
    const announcements = await Announcement.findAll();
    res.json({ code: 200, data: announcements });
  } catch (err) {
    console.error('获取公告失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.post('/announcements', auth, async (req, res) => {
  try {
    const { title, content, type } = req.body;
    if (!title) {
      return res.json({ code: 400, message: '标题不能为空' });
    }
    const id = await Announcement.create({ title, content, type });
    res.json({ code: 200, message: '公告创建成功', data: { id } });
  } catch (err) {
    console.error('创建公告失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.put('/announcements/:id', auth, async (req, res) => {
  try {
    const { title, content, type, is_active } = req.body;
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.json({ code: 404, message: '公告不存在' });
    }
    await Announcement.update(req.params.id, {
      title: title || announcement.title,
      content: content !== undefined ? content : announcement.content,
      type: type || announcement.type,
      is_active: is_active !== undefined ? is_active : announcement.is_active
    });
    res.json({ code: 200, message: '公告更新成功' });
  } catch (err) {
    console.error('更新公告失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

router.delete('/announcements/:id', auth, async (req, res) => {
  try {
    await Announcement.delete(req.params.id);
    res.json({ code: 200, message: '公告已删除' });
  } catch (err) {
    console.error('删除公告失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// ===== 一键浇水 =====
router.post('/waterAll', auth, async (req, res) => {
  try {
    const lands = await Land.findByUserId(req.user.id);
    let count = 0;
    for (const land of lands) {
      if (land.status !== 'empty' && land.crop_id && !land.watered_at) {
        await Land.water(req.user.id, land.land_index);
        count++;
      }
    }
    res.json({ code: 200, message: count > 0 ? '已浇水 '+count+' 块地 🌊' : '没有需要浇水的地' });
  } catch (err) {
    console.error('一键浇水失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

// ===== 一键收获 =====
router.post('/harvestAll', auth, async (req, res) => {
  try {
    const lands = await Land.findByUserId(req.user.id);
    const CropConfig = require('../models/CropConfig');
    let count = 0;
    let totalGold = 0;
    let totalExp = 0;
    for (const land of lands) {
      if (land.status !== 'empty' && land.crop_id) {
        const crop = await CropConfig.findById(land.crop_id);
        if (!crop) continue;
        const plantedAt = new Date(String(land.planted_at).includes('T') ? land.planted_at : String(land.planted_at).replace(' ','T')+'Z').getTime();
        const waterBonus = land.watered_at ? 0.3 : 0;
        const effectiveTime = crop.growth_time * 1000 * (1 - waterBonus);
        const elapsed = Date.now() - plantedAt;
        if (elapsed >= effectiveTime) {
          const qty = Math.floor(Math.random() * 10) + 1;
          await Warehouse.add(req.user.id, land.crop_id, qty);
          await Land.harvest(req.user.id, land.land_index);
          await db.execute('UPDATE users SET gold = gold + ? WHERE id = ?', [crop.sell_price * qty, req.user.id]);
          await User.addExperience(req.user.id, crop.experience * qty);
          count++;
          totalGold += crop.sell_price * qty;
          totalExp += crop.experience * qty;
        }
      }
    }
    const msg = count > 0 ? '收获 '+count+' 块地！⭐+'+totalExp : '没有成熟作物';
    res.json({ code: 200, message: msg });
  } catch (err) {
    console.error('一键收获失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

