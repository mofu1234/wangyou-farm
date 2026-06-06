# 🚀 忘忧农场 - 部署指南

本指南帮助你将忘忧农场部署到生产环境。

## 目录

- [在线体验](#在线体验)
- [环境要求](#环境要求)
- [方式一：传统部署](#方式一传统部署)
- [方式二：Docker 部署](#方式二docker-部署)
- [Nginx 配置](#nginx-配置)
- [SSL 证书](#ssl-证书)
- [常见问题](#常见问题)

---

## 在线体验

**👉 [立即体验忘忧农场](https://forget.icu/farm/)**

> 无需安装，打开浏览器即可畅玩！

如果你想自己部署，可以参考下面的指南。

## 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | 16.0 | 18.x LTS |
| MySQL | 8.0 | 8.0+ |
| Nginx | 1.18 | 最新稳定版 |
| PM2 | 5.0 | 最新版（可选） |

---

## 方式一：传统部署

### 1. 安装系统依赖

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm mysql-server nginx

# CentOS/RHEL
sudo yum install -y nodejs npm mysql-server nginx

# 或使用 NodeSource 安装最新 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. 配置 MySQL

```bash
# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全初始化
sudo mysql_secure_installation

# 创建数据库
mysql -u root -p < database/init.sql
```

### 3. 配置应用

```bash
# 进入项目
cd wangyou-farm

# 配置环境变量
cd server
cp .env.example .env
vim .env  # 填入实际配置

# 生成管理员密码哈希
cd ..
node scripts/generate-admin-hash.js YourSecurePassword
# 将输出的哈希值复制到 server/.env 的 ADMIN_PASSWORD_HASH

# 安装依赖
cd server
npm install --production
```

### 4. 使用 PM2 启动

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
cd server
pm2 start ../deploy/pm2/ecosystem.config.js

# 查看状态
pm2 status

# 保存进程列表（开机自启）
pm2 save
pm2 startup
```

### 5. 配置 Nginx

```bash
# 复制配置文件
sudo cp deploy/nginx/farm.conf /etc/nginx/sites-available/farm

# 编辑配置（修改域名）
sudo vim /etc/nginx/sites-available/farm

# 创建软链接
sudo ln -s /etc/nginx/sites-available/farm /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 方式二：Docker 部署

### 1. 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo apt install docker-compose -y
```

### 2. 配置环境变量

```bash
cd server
cp .env.example .env
vim .env  # 填入配置
```

### 3. 启动服务

```bash
cd docker

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## Nginx 配置

### 基础配置

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # 替换为你的域名

    # 前端静态文件
    location / {
        root /var/www/wangyou-farm/public;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 使用提供的配置

```bash
# 复制配置
sudo cp deploy/nginx/farm.conf /etc/nginx/sites-available/farm

# 修改域名
sudo sed -i 's/yourdomain.com/your_actual_domain.com/g' /etc/nginx/sites-available/farm

# 启用配置
sudo ln -sf /etc/nginx/sites-available/farm /etc/nginx/sites-enabled/

# 测试并重载
sudo nginx -t && sudo systemctl reload nginx
```

---

## SSL 证书

### 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

### 手动配置 SSL

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # ... 其他配置同上
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 常见问题

### 1. 数据库连接失败

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决方案：**
```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 启动 MySQL
sudo systemctl start mysql

# 检查 .env 配置
cat server/.env
```

### 2. 端口被占用

```
Error: listen EADDRINUSE :::3000
```

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或修改 .env 中的 PORT
```

### 3. 权限问题

```bash
# 确保应用目录有正确权限
sudo chown -R www-data:www-data /var/www/wangyou-farm
sudo chmod -R 755 /var/www/wangyou-farm
```

### 4. CORS 错误

如果前端和后端不在同一域名，需要配置 CORS：

```env
# 在 server/.env 中
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### 5. PM2 进程崩溃

```bash
# 查看错误日志
pm2 logs wangyou-farm

# 重启服务
pm2 restart wangyou-farm

# 清空日志
pm2 flush
```

---

## 监控与维护

### 查看日志

```bash
# PM2 日志
pm2 logs wangyou-farm

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MySQL 日志
sudo tail -f /var/log/mysql/error.log
```

### 数据库备份

```bash
# 备份
mysqldump -u root -p farm_game > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u root -p farm_game < backup_20260606.sql
```

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 安装依赖（如有更新）
cd server && npm install --production

# 重启服务
pm2 restart wangyou-farm
```

---

如有问题，请提交 [GitHub Issue](https://github.com/mofu1234/wangyou-farm/issues)。
