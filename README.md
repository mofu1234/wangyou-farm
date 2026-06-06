# 🌾 忘忧农场 (Wangyou Farm)

一个基于 QQ 农场风格的网页种田游戏，使用 Node.js + MySQL 全栈开发。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D16.0-green.svg)
![MySQL](https://img.shields.io/badge/mysql-%3E%3D8.0-blue.svg)

## ✨ 功能特性

### 🎮 游戏功能
- 🌱 **种植系统** - 49 种不同作物，6 大分类
- 💰 **经济系统** - 金币交易、买卖种子和产物
- 📦 **背包/仓库** - 种子背包与收获仓库分离管理
- ⏰ **实时生长** - 作物按真实时间自动生长
- 💧 **浇水加速** - 浇水可加速作物生长
- 📊 **等级经验** - 收获作物获得经验值，提升等级

### 📧 社交系统
- 📬 **邮件系统** - 接收系统邮件和管理员奖励
- 📢 **公告系统** - 游戏公告与红点提示
- 🔔 **实时通知** - 新邮件和公告实时提醒

### 🔧 管理后台
- 🔐 **安全登录** - JWT 认证 + bcrypt 密码加密
- 👥 **玩家管理** - 搜索玩家、查看信息
- 📨 **邮件发送** - 向玩家发送种子/作物/金币奖励
- 📊 **数据统计** - 在线用户、邮件统计

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | HTML5 + CSS3 + JavaScript（原生） |
| **后端** | Node.js + Express |
| **数据库** | MySQL 8.0+ |
| **认证** | JWT + bcrypt |
| **部署** | Nginx + PM2 / Docker |

## 📁 项目结构

```
wangyou-farm/
├── server/                    # 后端代码
│   ├── app.js                # Express 主入口
│   ├── package.json          # 依赖配置
│   ├── .env.example          # 环境变量示例
│   ├── config/               # 配置模块
│   │   ├── index.js
│   │   └── db.js
│   ├── models/               # 数据模型
│   │   ├── User.js
│   │   ├── CropConfig.js
│   │   ├── Land.js
│   │   ├── Bag.js
│   │   └── Warehouse.js
│   ├── routes/               # API 路由
│   │   ├── auth.js           # 认证接口
│   │   ├── shop.js           # 商店接口
│   │   └── farm.js           # 农场操作
│   └── middleware/
│       └── auth.js           # JWT 中间件
├── public/                   # 前端静态文件
│   └── index.html
├── database/
│   └── init.sql              # 数据库初始化脚本
├── deploy/                   # 部署配置
│   ├── pm2/
│   │   └── ecosystem.config.js
│   └── nginx/
│       └── farm.conf
├── docker/                   # Docker 配置
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/                  # 工具脚本
│   ├── generate-admin-hash.js
│   ├── setup-db.sh
│   └── start.sh
├── docs/                     # 文档
│   └── DEPLOY.md
├── index.html                # 游戏主页面
├── mofu.html                 # 管理后台页面
├── .gitignore
├── .env.example
├── LICENSE
└── README.md                 # 本文件
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 16.0
- **MySQL** >= 8.0
- **npm** 或 **yarn**

### 1. 克隆项目

```bash
git clone https://github.com/mofu1234/wangyou-farm.git
cd wangyou-farm
```

### 2. 配置数据库

#### 方式一：手动安装 MySQL

```bash
# 安装 MySQL（Ubuntu/Debian）
sudo apt update
sudo apt install mysql-server -y

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全初始化
sudo mysql_secure_installation
```

#### 方式二：使用 Docker

```bash
cd docker
docker-compose up -d mysql
```

### 3. 初始化数据库

```bash
# 方式一：使用脚本
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh

# 方式二：手动执行
mysql -u root -p < database/init.sql
```

### 4. 配置环境变量

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件，填入实际配置：

```env
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_password
DB_NAME=farm_game

# JWT 密钥（务必修改为强密码）
JWT_SECRET=your_random_secret_key_at_least_32_chars
JWT_EXPIRES_IN=7d

# 管理员配置
# 先生成密码哈希：node scripts/generate-admin-hash.js your_admin_password
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$xxxxx

# 服务端口
PORT=3000
```

### 5. 生成管理员密码

```bash
# 在项目根目录执行
node scripts/generate-admin-hash.js MySecurePassword123

# 将输出的哈希值复制到 .env 的 ADMIN_PASSWORD_HASH
```

### 6. 安装依赖并启动

```bash
# 安装后端依赖
cd server
npm install

# 启动服务
npm start

# 或使用开发模式（自动重启）
npm run dev
```

### 7. 访问游戏

- **游戏页面**: http://localhost:3000
- **管理后台**: http://localhost:3000/mofu.html
- **健康检查**: http://localhost:3000/api/health

## 📚 API 文档

### 认证接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |
| GET | `/api/auth/profile` | 获取用户信息 | ✅ |

**注册请求体：**
```json
{
  "username": "your_username",
  "nickname": "your_nickname",
  "password": "your_password"
}
```

### 商店接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/shop/crops` | 获取所有作物 | ❌ |
| POST | `/api/shop/buy` | 购买种子 | ✅ |
| POST | `/api/shop/sell` | 出售产物 | ✅ |

### 农场接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/farm/lands` | 获取土地状态 | ✅ |
| POST | `/api/farm/plant` | 播种 | ✅ |
| POST | `/api/farm/water` | 浇水 | ✅ |
| POST | `/api/farm/harvest` | 收获 | ✅ |
| POST | `/api/farm/remove` | 拔除作物 | ✅ |
| GET | `/api/farm/bag` | 获取背包 | ✅ |
| GET | `/api/farm/warehouse` | 获取仓库 | ✅ |

### 管理接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/farm/admin/login` | 管理员登录 | ❌ |
| GET | `/api/farm/admin/search-player` | 搜索玩家 | ✅ Admin |
| GET | `/api/farm/admin/crops` | 获取作物列表 | ✅ Admin |
| POST | `/api/farm/admin/send-email` | 发送邮件 | ✅ Admin |

## 🎮 游戏玩法

1. **注册账号** - 新用户赠送 3000 金币
2. **购买种子** - 在商店用金币购买种子
3. **播种** - 在土地上种植种子
4. **浇水** - 浇水可加速生长（可选）
5. **收获** - 作物成熟后收获，获得经验值
6. **出售** - 将仓库产物出售换取金币

### 作物分类

| 分类 | 数量 | 价格范围 | 生长时间 |
|------|------|----------|----------|
| 🥬 蔬菜 | 10 种 | 10-110 金币 | 5-15 分钟 |
| 🍎 水果 | 10 种 | 60-300 金币 | 12-25 分钟 |
| 🌾 粮食 | 8 种 | 20-110 金币 | 8-15 分钟 |
| 🌹 花卉 | 8 种 | 70-260 金币 | 15-25 分钟 |
| 💊 药材 | 8 种 | 120-700 金币 | 20-60 分钟 |
| 🌵 特殊 | 5 种 | 80-240 金币 | 15-30 分钟 |

## 🐳 Docker 部署

```bash
# 1. 配置环境变量
cd server
cp .env.example .env
# 编辑 .env 填入配置

# 2. 启动完整服务
cd ../docker
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

## 🔧 PM2 生产部署

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 启动服务
cd server
pm2 start ../deploy/pm2/ecosystem.config.js

# 3. 保存进程列表
pm2 save

# 4. 设置开机自启
pm2 startup
```

## 🔐 安全说明

1. **永远不要提交 `.env` 文件** - 包含数据库密码等敏感信息
2. **使用强密码** - JWT 密钥和管理员密码
3. **定期更新依赖** - `npm audit` 检查漏洞
4. **使用 HTTPS** - 生产环境务必配置 SSL

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 License

本项目使用 [MIT License](LICENSE) 开源协议。

## 👏 致谢

- 感谢 QQ 农场提供的游戏灵感
- 感谢 Node.js 和 MySQL 开源社区

---

**忘忧农场** 🌾 - 重拾田园时光
