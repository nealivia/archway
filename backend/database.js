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
      price REAL,
      price_unit TEXT DEFAULT '元/桶',
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
  `);

  // 初始化預設分類
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get();
  if (catCount.c === 0) {
    const insertCat = db.prepare('INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)');
    insertCat.run('防水塗料', '液態防水塗料系列', 1);
    insertCat.run('防水捲材', '捲材防水系統', 2);
    insertCat.run('填縫材料', '填縫與密封材料', 3);
    insertCat.run('底漆與處理劑', '底漆、界面處理劑', 4);
  }

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

  // 初始化預設設定
  const maintenanceSetting = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
  if (!maintenanceSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('maintenance_mode', 'false')").run();
  }

  console.log('✅ 資料庫初始化完成');
}

module.exports = { db, initDatabase };
