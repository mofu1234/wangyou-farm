const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use(express.static('../public'));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shop', require('./routes/shop'));
app.use('/api/farm', require('./routes/farm'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: '忘忧农场服务运行中 🌾', timestamp: new Date().toISOString() });
});

// 兜底路由
app.use((req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`\n🌾 忘忧农场 API 服务已启动`);
  console.log(`📍 地址: http://localhost:${config.port}`);
  console.log(`📍 健康检查: http://localhost:${config.port}/api/health\n`);
});

module.exports = app;
