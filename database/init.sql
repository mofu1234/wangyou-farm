-- ============================================================
-- 忘忧农场 数据库建表脚本
-- MySQL 8.0+
-- ============================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS farm_game DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE farm_game;

-- -----------------------------------------------------------
-- 1. 用户表 users
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(32)  NOT NULL COMMENT '唯一账号（登录用）',
  nickname      VARCHAR(32)  NOT NULL COMMENT '唯一昵称（显示用）',
  password      VARCHAR(255) NOT NULL COMMENT 'bcrypt 加密密码',
  gold          INT UNSIGNED NOT NULL DEFAULT 3000 COMMENT '金币',
  level         TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '等级',
  experience    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '经验值',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login    DATETIME     NULL,
  UNIQUE KEY uk_username (username),
  UNIQUE KEY uk_nickname (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- -----------------------------------------------------------
-- 2. 作物配置表 crop_configs（先建，供外键引用）
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_configs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(32)  NOT NULL COMMENT '作物名称',
  category      VARCHAR(16)  NOT NULL COMMENT '分类',
  buy_price     INT UNSIGNED NOT NULL COMMENT '购买价格（金币）',
  sell_price    INT UNSIGNED NOT NULL COMMENT '出售价格（金币）',
  growth_time   INT UNSIGNED NOT NULL COMMENT '成熟时间（秒）',
  experience    INT UNSIGNED NOT NULL COMMENT '收获经验',
  seed_icon     VARCHAR(64)  NULL COMMENT '种子图标路径',
  stage1_icon   VARCHAR(64)  NULL COMMENT '幼苗图标',
  stage2_icon   VARCHAR(64)  NULL COMMENT '成长图标',
  stage3_icon   VARCHAR(64)  NULL COMMENT '成熟图标',
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作物配置表';

-- -----------------------------------------------------------
-- 3. 土地表 lands
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lands (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  land_index    TINYINT UNSIGNED NOT NULL COMMENT '地块编号 1-12',
  status        ENUM('empty','planting','growing','mature','withered') NOT NULL DEFAULT 'empty',
  crop_id       INT UNSIGNED NULL COMMENT '作物ID，NULL表示空地',
  planted_at    DATETIME     NULL COMMENT '播种时间',
  watered_at    DATETIME     NULL COMMENT '浇水时间',
  fertilized_at DATETIME     NULL COMMENT '施肥时间',
  UNIQUE KEY uk_user_land (user_id, land_index),
  CONSTRAINT fk_land_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_land_crop FOREIGN KEY (crop_id) REFERENCES crop_configs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='土地表';

-- -----------------------------------------------------------
-- 4. 背包表 bags（种子背包）
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS bags (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  crop_id       INT UNSIGNED NOT NULL COMMENT '作物ID',
  quantity      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '数量',
  UNIQUE KEY uk_user_crop (user_id, crop_id),
  CONSTRAINT fk_bag_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bag_crop FOREIGN KEY (crop_id) REFERENCES crop_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='背包表';

-- -----------------------------------------------------------
-- 5. 仓库表 warehouses（收获产物）
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS warehouses (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  crop_id       INT UNSIGNED NOT NULL COMMENT '作物ID',
  quantity      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '数量',
  UNIQUE KEY uk_user_crop_wh (user_id, crop_id),
  CONSTRAINT fk_wh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_wh_crop FOREIGN KEY (crop_id) REFERENCES crop_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='仓库表';

-- -----------------------------------------------------------
-- 初始化作物数据（49种）
-- -----------------------------------------------------------
INSERT INTO crop_configs (name, category, buy_price, sell_price, growth_time, experience) VALUES
-- === 蔬菜类 10 种 ===
('白菜',   '蔬菜',  10,   20,  300,   10),
('萝卜',   '蔬菜',  15,   30,  360,   12),
('番茄',   '蔬菜',  20,   40,  480,   15),
('黄瓜',   '蔬菜',  25,   50,  540,   18),
('茄子',   '蔬菜',  30,   60,  600,   20),
('辣椒',   '蔬菜',  35,   70,  660,   22),
('土豆',   '蔬菜',  40,   80,  720,   25),
('玉米',   '蔬菜',  45,   90,  780,   28),
('南瓜',   '蔬菜',  50,  100,  840,   30),
('豆角',   '蔬菜',  55,  110,  900,   35),

-- === 水果类 10 种 ===
('苹果',   '水果',  60,  120,  900,   35),
('香蕉',   '水果',  70,  140,  960,   38),
('橙子',   '水果',  80,  160, 1020,   40),
('葡萄',   '水果',  90,  180, 1080,   42),
('草莓',   '水果', 100,  200,  720,   45),
('西瓜',   '水果', 120,  240, 1200,   50),
('桃子',   '水果', 110,  220, 1100,   48),
('梨',     '水果',  85,  170, 1000,   40),
('樱桃',   '水果', 130,  260, 1300,   55),
('芒果',   '水果', 150,  300, 1500,   60),

-- === 粮食类 8 种 ===
('小麦',   '粮食',  20,   40,  480,   15),
('水稻',   '粮食',  25,   50,  540,   18),
('大豆',   '粮食',  30,   60,  600,   20),
('高粱',   '粮食',  35,   70,  660,   22),
('燕麦',   '粮食',  40,   80,  720,   25),
('绿豆',   '粮食',  45,   90,  780,   28),
('花生',   '粮食',  50,  100,  840,   30),
('芝麻',   '粮食',  55,  110,  900,   35),

-- === 花卉类 8 种 ===
('玫瑰',   '花卉',  80,  160, 1000,   40),
('向日葵', '花卉',  90,  180, 1100,   45),
('郁金香', '花卉', 100,  200, 1200,   50),
('百合',   '花卉', 110,  220, 1300,   55),
('菊花',   '花卉',  70,  140,  900,   35),
('牡丹',   '花卉', 130,  260, 1500,   65),
('紫罗兰', '花卉', 120,  240, 1400,   60),
('康乃馨', '花卉', 100,  200, 1100,   50),

-- === 药材类 8 种 ===
('人参',   '药材', 200,  400, 1800,   75),
('枸杞',   '药材', 150,  300, 1500,   60),
('灵芝',   '药材', 250,  500, 2400,   90),
('黄芪',   '药材', 180,  360, 1600,   70),
('当归',   '药材', 160,  320, 1500,   65),
('金银花', '药材', 120,  240, 1200,   50),
('三七',   '药材', 300,  600, 3000,  100),
('藏红花', '药材', 350,  700, 3600,  100),

-- === 特殊类 5 种 ===
('仙人掌', '特殊', 100,  200, 1800,   50),
('含羞草', '特殊',  80,  160, 1200,   40),
('薰衣草', '特殊', 120,  240, 1500,   55),
('薄荷',   '特殊',  90,  180,  900,   45),
('迷迭香', '特殊', 110,  220, 1200,   50);
