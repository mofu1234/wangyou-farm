const express = require('express');
const router = express.Router();
const CropConfig = require('../models/CropConfig');
const Bag = require('../models/Bag');
const Warehouse = require('../models/Warehouse');
const Land = require('../models/Land');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * GET /api/shop/crops
 * 获取商店所有作物列表
 */
router.get('/crops', auth, async (req, res) => {
  try {
    const category = req.query.category;
    let crops;
    if (category) {
      crops = await CropConfig.findByCategory(category);
    } else {
      crops = await CropConfig.findAll();
    }
    res.json({ code: 200, data: crops });
  } catch (err) {
    console.error('获取作物列表失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/shop/buy
 * 购买种子
 * body: { cropId, quantity }
 */
router.post('/buy', auth, async (req, res) => {
  try {
    const { cropId, quantity = 1 } = req.body;

    if (!cropId || quantity < 1) {
      return res.json({ code: 400, message: '参数错误' });
    }

    // 获取作物配置
    const crop = await CropConfig.findById(cropId);
    if (!crop) {
      return res.json({ code: 404, message: '作物不存在' });
    }

    const totalCost = crop.buy_price * quantity;

    // 获取用户信息
    const user = await User.findById(req.user.id);
    if (user.gold < totalCost) {
      return res.json({ code: 400, message: `金币不足，需要 ${totalCost} 金币，当前 ${user.gold} 金币` });
    }

    // 扣除金币 & 添加种子
    await User.updateGold(req.user.id, user.gold - totalCost);
    await Bag.add(req.user.id, cropId, quantity);

    res.json({
      code: 200,
      message: `购买成功：${crop.name} x${quantity}，花费 ${totalCost} 金币`,
      data: { gold: user.gold - totalCost },
    });
  } catch (err) {
    console.error('购买失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

/**
 * POST /api/shop/sell
 * 出售仓库产物
 * body: { cropId, quantity }
 */
router.post('/sell', auth, async (req, res) => {
  try {
    const { cropId, quantity = 1 } = req.body;

    if (!cropId || quantity < 1) {
      return res.json({ code: 400, message: '参数错误' });
    }

    const crop = await CropConfig.findById(cropId);
    if (!crop) {
      return res.json({ code: 404, message: '作物不存在' });
    }

    // 检查仓库库存
    const db = require('../config/db');
    const [rows] = await db.execute(
      'SELECT quantity FROM warehouses WHERE user_id = ? AND crop_id = ?',
      [req.user.id, cropId]
    );
    if (!rows.length || rows[0].quantity < quantity) {
      return res.json({ code: 400, message: '仓库中该作物数量不足' });
    }

    const earnGold = crop.sell_price * quantity;
    const user = await User.findById(req.user.id);

    await Warehouse.consume(req.user.id, cropId, quantity);
    await User.updateGold(req.user.id, user.gold + earnGold);

    res.json({
      code: 200,
      message: `出售成功：${crop.name} x${quantity}，获得 ${earnGold} 金币`,
      data: { gold: user.gold + earnGold },
    });
  } catch (err) {
    console.error('出售失败:', err);
    res.json({ code: 500, message: '服务器错误' });
  }
});

module.exports = router;
