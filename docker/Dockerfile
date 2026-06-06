# 忘忧农场 - Docker 构建文件

FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY server/package*.json ./

# 安装生产依赖
RUN npm ci --only=production

# 复制应用代码
COPY server/ ./
COPY public/ ../public/
COPY database/ ../database/

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "app.js"]
