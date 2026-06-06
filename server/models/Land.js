const db = require('../config/db');

const Land = {
  /**
   * 获取用户所有土地
   */
  async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT l.*, c.name AS crop_name, c.category AS crop_category
       FROM lands l
       LEFT JOIN crop_configs c ON l.crop_id = c.id
       WHERE l.user_id = ?
       ORDER BY l.land_index`,
      [userId]
    );
    return rows;
  },

  /**
   * 根据用户ID和地块编号获取土地
   */
  async findByUserAndIndex(userId, landIndex) {
    const [rows] = await db.execute(
      'SELECT * FROM lands WHERE user_id = ? AND land_index = ?',
      [userId, landIndex]
    );
    return rows[0] || null;
  },

  /**
   * 创建12块初始土地
   */
  async initLands(userId) {
    const values = [];
    for (let i = 1; i <= 12; i++) {
      values.push([userId, i]);
    }
    await db.query(
      'INSERT INTO lands (user_id, land_index) VALUES ?',
      [values]
    );
  },

  /**
   * 更新土地状态（播种）
   */
  async plant(userId, landIndex, cropId) {
    await db.execute(
      `UPDATE lands SET status = 'planting', crop_id = ?, planted_at = NOW()
       WHERE user_id = ? AND land_index = ?`,
      [cropId, userId, landIndex]
    );
  },

  /**
   * 浇水
   */
  async water(userId, landIndex) {
    await db.execute(
      `UPDATE lands SET watered_at = NOW()
       WHERE user_id = ? AND land_index = ? AND status IN ('planting','growing')`,
      [userId, landIndex]
    );
  },

  /**
   * 收获
   */
  async harvest(userId, landIndex) {
    await db.execute(
      `UPDATE lands SET status = 'empty', crop_id = NULL, planted_at = NULL,
       watered_at = NULL, fertilized_at = NULL
       WHERE user_id = ? AND land_index = ? AND status != 'empty'`,
      [userId, landIndex]
    );
  },

  /**
   * 拔掉作物
   */
  async remove(userId, landIndex) {
    await db.execute(
      `UPDATE lands SET status = 'empty', crop_id = NULL, planted_at = NULL,
       watered_at = NULL, fertilized_at = NULL
       WHERE user_id = ? AND land_index = ? AND status != 'empty'`,
      [userId, landIndex]
    );
  },
};

module.exports = Land;
