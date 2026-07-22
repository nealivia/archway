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

  // FAQ 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT '',
      question TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  // Seed 初始資料（只在表格為空時）
  const faqCount = db.prepare('SELECT COUNT(*) as c FROM faqs').get();
  if (faqCount.c === 0) {
    const ins = db.prepare('INSERT INTO faqs (category, question, answer, sort_order) VALUES (?, ?, ?, ?)');
    ins.run('施工前準備', '施工前基面需要怎麼處理？', '基面必須乾淨、乾燥、無粉塵、無油污、無起砂。舊有疏鬆或剝落的材料需徹底清除，裂縫建議先填補後再進行防水施工。若基面過於乾燥，可先潤濕（飽和面乾）再施工。', 1);
    ins.run('施工前準備', '需要先塗底漆嗎？', '視材料與基材而定。多數水性防水塗料可免底漆直接施工。混凝土或吸水性強的基面建議先塗界面處理劑（Primer），以提升附著力。詳情請參考各產品技術文件或來電洽詢。', 2);
    ins.run('施工前準備', '下雨天或潮濕環境可以施工嗎？', '建議在天氣晴朗、氣溫 5–40°C、相對濕度 85% 以下時施工。部分產品（如水泥基防水材）可在潮濕面施工，但不可在積水或雨天進行。具體請參閱各產品說明。', 3);
    ins.run('施工方式', '需要塗幾道？每道之間要等多久？', '一般建議至少 2 道，且方向交叉（橫向＋縱向）以確保均勻覆蓋。每道需待前一道完全乾燥（表乾，通常 4–8 小時）後再施作。完整乾燥時間依氣溫與濕度不同，通常為 24–72 小時。', 1);
    ins.run('施工方式', '用刷子、滾筒還是噴塗？', '三種方式均可，依現場條件與產品特性選擇。刷塗適合細部角隅；滾筒效率高，適合大面積；噴塗速度最快但需專業設備。初次施工建議使用刷塗，確保滲透均勻。', 2);
    ins.run('施工方式', '防水層施工完多久可以通水或踩踏？', '一般塗料乾燥後 4–8 小時可輕踩，但完整固化需 7 天。建議 24 小時後再進行淋水測試，7 天後才能恢復正常使用或覆蓋面層材料。', 3);
    ins.run('產品選擇', '屋頂平台和浴室應該用不同的防水材料嗎？', '是的。屋頂需承受紫外線、溫差大，適合彈性高、耐候性強的防水塗料（如聚氨酯或丙烯酸系）。浴室面積小、需耐長期潮濕，可選用水泥基防水材或衛浴專用彈性防水膠，無毒環保更佳。', 1);
    ins.run('產品選擇', '舊有防水層可以直接覆蓋嗎？', '視舊有防水層狀況而定。若附著良好、無起鼓或剝落，部分材料可直接覆蓋。若舊層已失效、有積水或大面積開裂，建議先移除再重新施工。不確定時，請來電讓我們的技術人員協助判斷。', 2);
  }

  // 初始化預設設定
  const maintenanceSetting = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
  if (!maintenanceSetting) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('maintenance_mode', 'false')").run();
  }

  console.log('✅ 資料庫初始化完成');
}

module.exports = { db, initDatabase };
