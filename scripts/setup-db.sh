#!/bin/bash
#
# 忘忧农场 - 数据库初始化脚本
# 
# 使用方法：
# chmod +x scripts/setup-db.sh
# ./scripts/setup-db.sh
#

set -e

echo "🌾 忘忧农场 - 数据库初始化"
echo "=========================="

# 检查 MySQL 是否可用
if ! command -v mysql &> /dev/null; then
    echo "❌ 未找到 mysql 命令，请先安装 MySQL"
    echo "   Ubuntu/Debian: sudo apt install mysql-server"
    echo "   CentOS/RHEL: sudo yum install mysql-server"
    exit 1
fi

# 提示输入数据库密码
read -p "请输入 MySQL root 密码（无密码直接回车）: " -s DB_PASSWORD
echo

# 执行初始化
echo "📦 正在初始化数据库..."
if [ -z "$DB_PASSWORD" ]; then
    mysql -u root < database/init.sql
else
    mysql -u root -p"$DB_PASSWORD" < database/init.sql
fi

if [ $? -eq 0 ]; then
    echo "✅ 数据库初始化成功！"
    echo ""
    echo "📊 已创建："
    echo "   - 数据库：farm_game"
    echo "   - 数据表：users, crop_configs, lands, bags, warehouses"
    echo "   - 作物数据：49 种"
    echo ""
else
    echo "❌ 数据库初始化失败"
    exit 1
fi
