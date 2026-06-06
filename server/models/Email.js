const db = require('../config/db');

class Email {
  static async findByUserId(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM emails WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  static async findById(emailId) {
    const [rows] = await db.execute('SELECT * FROM emails WHERE id = ?', [emailId]);
    return rows[0] || null;
  }

  static async markAsRead(emailId) {
    await db.execute('UPDATE emails SET is_read = 1 WHERE id = ?', [emailId]);
  }

  static async markClaimed(emailId) {
    await db.execute('UPDATE emails SET claimed = 1 WHERE id = ?', [emailId]);
  }

  static async delete(emailId) {
    await db.execute('DELETE FROM emails WHERE id = ?', [emailId]);
  }

  static async create({ userId, title, content, type, items }) {
    const [result] = await db.execute(
      'INSERT INTO emails (user_id, title, content, type, items) VALUES (?, ?, ?, ?, ?)',
      [userId, title, content, type || 'system', items ? JSON.stringify(items) : null]
    );
    return result.insertId;
  }

  static async countUnread(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM emails WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].count;
  }
}

module.exports = Email;
