const db = require('../config/db');

const Warehouse = {
  /**
   * 获取用户仓库
   */
  async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT w.*, c.name AS crop_name, c.category AS crop_category, c.sell_price, c.seed_icon, c.stage1_icon, c.stage2_icon, c.stage3_icon
       FROM warehouses w
       JOIN crop_configs c ON w.crop_id = c.id
       WHERE w.user_id = ?
       ORDER BY w.id`,
      [userId]
    );
    return rows;
  },

  /**
   * 添加产物到仓库
   */
  async add(userId, cropId, quantity = 1) {
    const [existing] = await db.execute(
      'SELECT id FROM warehouses WHERE user_id = ? AND crop_id = ?',
      [userId, cropId]
    );

    if (existing.length > 0) {
      await db.execute(
        'UPDATE warehouses SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await db.execute(
        'INSERT INTO warehouses (user_id, crop_id, quantity) VALUES (?, ?, ?)',
        [userId, cropId, quantity]
      );
    }
  },

  /**
   * 消耗仓库产物
   */
  async consume(userId, cropId, quantity = 1) {
    await db.execute(
      'UPDATE warehouses SET quantity = quantity - ? WHERE user_id = ? AND crop_id = ? AND quantity >= ?',
      [quantity, userId, cropId, quantity]
    );
    await db.execute(
      'DELETE FROM warehouses WHERE user_id = ? AND crop_id = ? AND quantity <= 0',
      [userId, cropId]
    );
  },
};

module.exports = Warehouse;
