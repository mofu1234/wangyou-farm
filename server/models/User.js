const db = require('../config/db');

const User = {
  /**
   * 根据用户名查找用户
   */
  async findByUsername(username) {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  },

  /**
   * 根据昵称查找用户
   */
  async findByNickname(nickname) {
    const [rows] = await db.execute('SELECT * FROM users WHERE nickname = ?', [nickname]);
    return rows[0] || null;
  },

  /**
   * 创建用户
   */
  async create({ username, nickname, password }) {
    const [result] = await db.execute(
      'INSERT INTO users (username, nickname, password) VALUES (?, ?, ?)',
      [username, nickname, password]
    );
    return result.insertId;
  },

  /**
   * 根据 ID 查找用户
   */
  async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, username, nickname, gold, level, experience, created_at, last_login FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id) {
    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
  },

  /**
   * 更新金币
   */
  async updateGold(id, gold) {
    await db.execute('UPDATE users SET gold = ? WHERE id = ?', [gold, id]);
  },

  /**
   * 增加经验
   */
  async addExperience(id, amount) {
    await db.execute(
      'UPDATE users SET experience = experience + ? WHERE id = ?',
      [amount, id]
    );
    // 循环检查升级
    let [rows] = await db.execute('SELECT level, experience FROM users WHERE id = ?', [id]);
    while (rows.length) {
      const user = rows[0];
      const expNeeded = Math.floor(100 * Math.pow(1.2, user.level - 1));
      if (user.experience >= expNeeded) {
        await db.execute(
          'UPDATE users SET level = level + 1, experience = experience - ? WHERE id = ?',
          [expNeeded, id]
        );
        [rows] = await db.execute('SELECT level, experience FROM users WHERE id = ?', [id]);
      } else {
        break;
      }
    }
  },
};

module.exports = User;
