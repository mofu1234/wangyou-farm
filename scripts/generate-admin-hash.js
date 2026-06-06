#!/usr/bin/env node
/**
 * 生成管理员密码的 bcrypt 哈希值
 * 
 * 使用方法：
 * node scripts/generate-admin-hash.js your_password_here
 * 
 * 或交互式输入：
 * node scripts/generate-admin-hash.js
 */

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function hashPassword(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log('\n✅ 密码哈希生成成功：\n');
  console.log('哈希值：', hash);
  console.log('\n📋 将以下内容添加到 .env 文件：');
  console.log(`ADMIN_USERNAME=admin`);
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log('\n⚠️  请妥善保管此哈希值，不要泄露！');
}

const password = process.argv[2];

if (password) {
  hashPassword(password).then(() => rl.close());
} else {
  rl.question('🔑 请输入管理员密码：', (pwd) => {
    rl.close();
    if (!pwd) {
      console.error('❌ 密码不能为空');
      process.exit(1);
    }
    hashPassword(pwd);
  });
}
