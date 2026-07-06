const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

// 啟用 WAL 模式提升效能
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('super_admin', 'admin')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      short_desc TEXT,
      description TEXT,
      features TEXT DEFAULT '[]',
      applications TEXT DEFAULT '[]',
      shopee_url TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      datasheet_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      hours TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 初始化預設超級管理員（密碼隨機產生，只顯示一次）
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount.c === 0) {
    const randomPassword = require('crypto').randomBytes(10).toString('base64url');
    const hash = bcrypt.hashSync(randomPassword, 10);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run('superadmin', 'archway1991@gmail.com', hash, 'super_admin');
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║        🔐 管理員帳號已建立           ║');
    console.log('║  帳號：superadmin                    ║');
    console.log(`║  密碼：${randomPassword.padEnd(28)}║`);
    console.log('║  請登入後立即至後台修改密碼！        ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
  }

  // 清除重複門市（保留每個名稱中 id 最小的那筆）
  db.exec(`DELETE FROM stores WHERE id NOT IN (SELECT MIN(id) FROM stores GROUP BY name)`);

  // 初始化門市資料（只在表格為空時執行）
  const storeCount = db.prepare('SELECT COUNT(*) as c FROM stores').get();
  if (storeCount.c === 0) {
    const insertStore = db.prepare('INSERT INTO stores (name, address, phone, hours, sort_order) VALUES (?, ?, ?, ?, ?)');
    insertStore.run('和平店', '台北市中正區和平西路一段136號1樓', '02-2365-0047', '週一至週六 07:00–19:00', 1);
    insertStore.run('板橋店', '新北市板橋區中山路二段384號1樓', '02-2957-6311', '週一至週五 07:00–19:00', 2);
    insertStore.run('樹林 Sika 展示店', '新北市樹林區東興街37號1樓', '02-8685-8039', '週一至週五 08:00–17:00', 3);
  }

  // 欄位升級 migrations（順序重要：先刪舊欄位，再加新欄位）
  try { db.exec("ALTER TABLE products DROP COLUMN price_unit"); } catch (e) { /* 忽略 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN shopee_url TEXT DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN installation_url TEXT DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN is_featured INTEGER DEFAULT 0"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN price INTEGER DEFAULT 0"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT NULL"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN prices TEXT DEFAULT '[]'"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN youtube_url TEXT DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN colors TEXT DEFAULT '[]'"); } catch (e) { /* 已存在 */ }

  // 初始化預設設定
  const maintenanceSetting = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
  if (!maintenanceSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('maintenance_mode', 'false')").run();
  }

  console.log('✅ 資料庫初始化完成');
}

module.exports = { db, initDatabase };
