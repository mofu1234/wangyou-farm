const db = require('../config/db');

const Bag = {
  /**
   * 获取用户背包
   */
  async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT b.*, c.name AS crop_name, c.category AS crop_category, c.seed_icon, c.stage1_icon, c.stage2_icon, c.stage3_icon
       FROM bags b
       JOIN crop_configs c ON b.crop_id = c.id
       WHERE b.user_id = ?
       ORDER BY b.id`,
      [userId]
    );
    return rows;
  },

  /**
   * 添加种子到背包
   */
  async add(userId, cropId, quantity = 1) {
    const [existing] = await db.execute(
      'SELECT id, quantity FROM bags WHERE user_id = ? AND crop_id = ?',
      [userId, cropId]
    );

    if (existing.length > 0) {
      await db.execute(
        'UPDATE bags SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await db.execute(
        'INSERT INTO bags (user_id, crop_id, quantity) VALUES (?, ?, ?)',
        [userId, cropId, quantity]
      );
    }
  },

  /**
   * 消耗种子
   */
  async consume(userId, cropId, quantity = 1) {
    await db.execute(
      'UPDATE bags SET quantity = quantity - ? WHERE user_id = ? AND crop_id = ? AND quantity >= ?',
      [quantity, userId, cropId, quantity]
    );
    // 清理数量为0的记录
    await db.execute(
      'DELETE FROM bags WHERE user_id = ? AND crop_id = ? AND quantity <= 0',
      [userId, cropId]
    );
  },
};

module.exports = Bag;
