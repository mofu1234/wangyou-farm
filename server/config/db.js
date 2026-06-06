const mysql = require('mysql2/promise');
const config = require('./index');

// 创建连接池
const pool = mysql.createPool(config.db);

// 测试连接
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL 连接成功');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL 连接失败:', err.message);
  });

module.exports = pool;
