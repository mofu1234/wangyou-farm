const db = require('../config/db');

class Announcement {
  static async findAll() {
    const [rows] = await db.execute(
      'SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC'
    );
    return rows;
  }

  static async findAllAdmin() {
    const [rows] = await db.execute('SELECT * FROM announcements ORDER BY created_at DESC');
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM announcements WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async create({ title, content, type }) {
    const [result] = await db.execute(
      'INSERT INTO announcements (title, content, type) VALUES (?, ?, ?)',
      [title, content, type || 'notice']
    );
    return result.insertId;
  }

  static async update(id, { title, content, type, is_active }) {
    await db.execute(
      'UPDATE announcements SET title = ?, content = ?, type = ?, is_active = ? WHERE id = ?',
      [title, content, type, is_active !== undefined ? is_active : 1, id]
    );
  }

  static async delete(id) {
    await db.execute('DELETE FROM announcements WHERE id = ?', [id]);
  }
}

module.exports = Announcement;
