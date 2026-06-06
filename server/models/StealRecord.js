const db = require('../config/db');

const StealRecord = {
  /**
   * 检查是否已偷过
   */
  async hasStolen(stealerId, victimId, landIndex) {
    const [rows] = await db.execute(
      'SELECT id FROM steal_records WHERE stealer_id = ? AND victim_id = ? AND land_index = ?',
      [stealerId, victimId, landIndex]
    );
    return rows.length > 0;
  },

  /**
   * 记录偷菜
   */
  async create({ stealerId, victimId, landIndex, cropId, quantity }) {
    await db.execute(
      'INSERT INTO steal_records (stealer_id, victim_id, land_index, crop_id, quantity) VALUES (?, ?, ?, ?, ?)',
      [stealerId, victimId, landIndex, cropId, quantity]
    );
  },

  /**
   * 获取用户偷过的记录（用于前端显示）
   */
  async findByVictimAndStealer(victimId, stealerId) {
    const [rows] = await db.execute(
      'SELECT land_index FROM steal_records WHERE victim_id = ? AND stealer_id = ?',
      [victimId, stealerId]
    );
    return rows;
  },
};

module.exports = StealRecord;
