const db = require('../config/db');

const CropConfig = {
  /**
   * 获取所有作物配置
   */
  async findAll() {
    const [rows] = await db.execute('SELECT * FROM crop_configs ORDER BY id');
    return rows;
  },

  /**
   * 按分类获取作物
   */
  async findByCategory(category) {
    const [rows] = await db.execute(
      'SELECT * FROM crop_configs WHERE category = ? ORDER BY id',
      [category]
    );
    return rows;
  },

  /**
   * 根据 ID 获取作物配置
   */
  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM crop_configs WHERE id = ?', [id]);
    return rows[0] || null;
  },
};

module.exports = CropConfig;
