#!/bin/bash
#
# 忘忧农场 - 服务启动脚本
# 
# 使用方法：
# chmod +x scripts/start.sh
# ./scripts/start.sh          # 前台运行
# ./scripts/start.sh --dev    # 开发模式（热重载）
#

set -e

echo "🌾 忘忧农场 - 启动服务"
echo "========================"

cd server

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
fi

# 检查 .env 是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件"
    echo "   请复制 .env.example 为 .env 并配置数据库连接"
    echo "   cp .env.example .env"
    echo "   vim .env"
    exit 1
fi

# 启动服务
if [ "$1" = "--dev" ]; then
    echo "🔧 开发模式启动..."
    npm run dev
else
    echo "🚀 生产模式启动..."
    npm start
fi
