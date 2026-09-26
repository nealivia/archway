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
      role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('super_admin', 'admin', 'store', 'driver')),
      store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
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
  try { db.exec("ALTER TABLE products ADD COLUMN report_url TEXT DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN reports TEXT DEFAULT '[]'"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN youtube_url TEXT DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE products ADD COLUMN colors TEXT DEFAULT '[]'"); } catch (e) { /* 已存在 */ }

  // users 表升級：加入 store 角色與 store_id（SQLite 不支援直接修改 CHECK 約束，需重建表）
  try {
    const usersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (usersSchema && !usersSchema.sql.includes("'store'")) {
      // activity_log 等表有 FK 指向 users，重建表前必須關閉 FK 檢查，否則 DROP TABLE 會失敗
      db.exec('PRAGMA foreign_keys = OFF');
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('super_admin', 'admin', 'store')),
          store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          totp_secret TEXT DEFAULT NULL,
          totp_enabled INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO users_new (id, username, email, password_hash, role, is_active, totp_secret, totp_enabled, created_at, updated_at)
          SELECT id, username, email, password_hash, role, is_active, totp_secret, totp_enabled, created_at, updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      db.exec('PRAGMA foreign_keys = ON');
      console.log('✅ users 表已升級（新增 store 角色與 store_id 欄位）');
    }
  } catch (e) {
    db.exec('PRAGMA foreign_keys = ON');
    console.error('❌ users 表升級失敗:', e.message);
  }

  // users 表升級：加入 driver（司機）角色，只能切換配送狀態，不能改內容、不綁定分店
  try {
    const usersSchema2 = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (usersSchema2 && !usersSchema2.sql.includes("'driver'")) {
      db.exec('PRAGMA foreign_keys = OFF');
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('super_admin', 'admin', 'store', 'driver')),
          store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          totp_secret TEXT DEFAULT NULL,
          totp_enabled INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO users_new (id, username, email, password_hash, role, store_id, is_active, totp_secret, totp_enabled, created_at, updated_at)
          SELECT id, username, email, password_hash, role, store_id, is_active, totp_secret, totp_enabled, created_at, updated_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
      `);
      db.exec('PRAGMA foreign_keys = ON');
      console.log('✅ users 表已升級（新增 driver 司機角色）');
    }
  } catch (e) {
    db.exec('PRAGMA foreign_keys = ON');
    console.error('❌ users 表升級失敗（driver 角色）:', e.message);
  }

  // 分店電子佈告欄
  db.exec(`
    CREATE TABLE IF NOT EXISTS board_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      delivery_time TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT '',
      content TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      customer_contact TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT '待配送',
      created_by TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      delivery_type TEXT NOT NULL DEFAULT '客人配送',
      transfer_to_store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
      transfer_to TEXT NOT NULL DEFAULT '',
      transfer_from TEXT NOT NULL DEFAULT '',
      transfer_item TEXT NOT NULL DEFAULT '',
      proof_photo TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '缺貨',
      note TEXT DEFAULT '',
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_status_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT NOT NULL,
      resource_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 國定假日清單：自動改期(nextAvailableWeekday)判斷「下一個可配送日」時，除了跳過週六日，也會跳過這裡設定的日期
    CREATE TABLE IF NOT EXISTS board_holidays (
      date TEXT PRIMARY KEY,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 佈告欄常用查詢欄位加索引（依分店篩選、依日期排序/區間查詢、清理舊紀錄）
    CREATE INDEX IF NOT EXISTS idx_board_deliveries_time ON board_deliveries(delivery_time);
    CREATE INDEX IF NOT EXISTS idx_board_deliveries_store ON board_deliveries(store_id);
    CREATE INDEX IF NOT EXISTS idx_board_stock_updated ON board_stock(updated_at);
    CREATE INDEX IF NOT EXISTS idx_board_stock_store ON board_stock(store_id);
    CREATE INDEX IF NOT EXISTS idx_board_comments_created ON board_comments(created_at);
    CREATE INDEX IF NOT EXISTS idx_board_comments_store ON board_comments(store_id);
    CREATE INDEX IF NOT EXISTS idx_board_status_log_created ON board_status_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_board_status_log_store ON board_status_log(store_id);
  `);

  // 佈告欄上傳者紀錄：舊版本的表沒有 created_by 欄位，補上去（新建立的表已經包含在上面的 CREATE TABLE 裡，這裡會直接因為欄位已存在而失敗，屬正常情況）
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN created_by TEXT NOT NULL DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE board_stock ADD COLUMN created_by TEXT NOT NULL DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE board_comments ADD COLUMN created_by TEXT NOT NULL DEFAULT ''"); } catch (e) { /* 已存在 */ }
  // 今日配送總覽的司機路線手動排序（同一天同一時段內的順序），舊表補欄位
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0"); } catch (e) { /* 已存在 */ }
  // 配送單分「配送貨物給客人」跟「分店調撥」兩種：調撥只需要填目標分店與時間，其他欄位不必填
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN delivery_type TEXT NOT NULL DEFAULT '客人配送'"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN transfer_to_store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL"); } catch (e) { /* 已存在 */ }
  // 調撥目標後來還要能選「泰山倉」「富友倉」這種不是公司分店（stores 表）的倉庫，
  // 所以改存文字（transfer_to），不再限定只能是 stores 表裡的分店；上面舊的 transfer_to_store_id 欄位留著相容舊資料就好
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN transfer_to TEXT NOT NULL DEFAULT ''"); } catch (e) { /* 已存在 */ }
  // 分店調撥要能自選「起點 A → 終點 B」（不一定是建立資料的那家店），以及調撥的貨物內容
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN transfer_from TEXT NOT NULL DEFAULT ''"); } catch (e) { /* 已存在 */ }
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN transfer_item TEXT NOT NULL DEFAULT ''"); } catch (e) { /* 已存在 */ }
  // 送達證明照片路徑（切換成「已送達」時可以順手拍照上傳，之後有糾紛可以回頭查）
  try { db.exec("ALTER TABLE board_deliveries ADD COLUMN proof_photo TEXT NOT NULL DEFAULT ''"); } catch (e) { /* 已存在 */ }
  // 假日來源：'auto'=系統自動從台灣國定假日資料同步，'manual'=超級管理員手動新增/修改過。
  // 同步台灣假日時只會覆蓋 source='auto' 的資料，不會動到手動調整過的日期，避免自動同步蓋掉人工修正。
  try { db.exec("ALTER TABLE board_holidays ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'"); } catch (e) { /* 已存在 */ }

  // 初始化分店登入帳號（僅在該分店尚無帳號時建立，密碼隨機產生，只顯示一次）
  const boardUsernameMap = { '和平店': 'heping', '板橋店': 'banqiao', '樹林 Sika 展示店': 'shulin' };
  const allStores = db.prepare('SELECT id, name FROM stores').all();
  for (const s of allStores) {
    const exists = db.prepare("SELECT id FROM users WHERE role = 'store' AND store_id = ?").get(s.id);
    if (!exists) {
      const username = boardUsernameMap[s.name] || `store${s.id}`;
      const randomPassword = require('crypto').randomBytes(9).toString('base64url');
      const hash = bcrypt.hashSync(randomPassword, 10);
      db.prepare(`
        INSERT INTO users (username, email, password_hash, role, store_id)
        VALUES (?, ?, ?, 'store', ?)
      `).run(username, `${username}@archway.local`, hash, s.id);
      console.log('');
      console.log('╔══════════════════════════════════════╗');
      console.log('║        🏬 分店帳號已建立             ║');
      console.log(`║  分店：${s.name.padEnd(30)}║`);
      console.log(`║  帳號：${username.padEnd(30)}║`);
      console.log(`║  密碼：${randomPassword.padEnd(30)}║`);
      console.log('╚══════════════════════════════════════╝');
      console.log('');
    }
  }

  // 初始化司機帳號（全公司只有一位司機，只建立一次；不綁定分店，只能切換配送狀態，不能改內容或刪除）
  const driverExists = db.prepare("SELECT id FROM users WHERE role = 'driver'").get();
  if (!driverExists) {
    const driverUsername = 'driver';
    const driverPassword = require('crypto').randomBytes(9).toString('base64url');
    const driverHash = bcrypt.hashSync(driverPassword, 10);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, store_id)
      VALUES (?, ?, ?, 'driver', NULL)
    `).run(driverUsername, `${driverUsername}@archway.local`, driverHash);
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║        🚚 司機帳號已建立             ║');
    console.log(`║  帳號：${driverUsername.padEnd(30)}║`);
    console.log(`║  密碼：${driverPassword.padEnd(30)}║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('');
  }

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

  cleanupOldBoardRecords();

  console.log('✅ 資料庫初始化完成');
}

// 佈告欄歷史紀錄只保留一個月，超過的自動刪除（配送單依配送日期、缺訂貨依更新時間、
// 留言與狀態變更紀錄依建立時間）。伺服器啟動時執行一次，另外由 server.js 排程每天執行一次。
function cleanupOldBoardRecords() {
  try {
    const results = {
      deliveries: db.prepare(`DELETE FROM board_deliveries WHERE date(delivery_time) < date('now', '-30 days')`).run(),
      stock: db.prepare(`DELETE FROM board_stock WHERE date(updated_at) < date('now', '-30 days')`).run(),
      comments: db.prepare(`DELETE FROM board_comments WHERE date(created_at) < date('now', '-30 days')`).run(),
      statusLog: db.prepare(`DELETE FROM board_status_log WHERE date(created_at) < date('now', '-30 days')`).run()
    };
    const total = results.deliveries.changes + results.stock.changes + results.comments.changes + results.statusLog.changes;
    if (total > 0) {
      console.log(`🧹 已清除 ${total} 筆超過一個月的佈告欄歷史紀錄`);
    }
  } catch (e) {
    console.error('❌ 清除佈告欄舊紀錄失敗:', e.message);
  }
}

// ── 配送單逾時自動改期 ──────────────────────────────────────────────────
// 規則：早上時段（08:00–12:00）配送單如果到中午 12:00 還沒切換成「配送中」，
// 自動移到當天下午時段（13:30–16:00）；下午時段如果到 16:00 還沒切換成「配送中」，
// 自動移到下一個可配送日（跳過週六日）的早上時段。只處理仍是「待配送」的單，
// 已經是「配送中」或「已送達」的不會被搬動。伺服器每 10 分鐘檢查一次。
function periodOfDeliveryTimeInternal(dt) {
  const hhmm = (dt || '').slice(11, 16);
  return hhmm < '12:30' ? 'morning' : 'afternoon';
}

// 這裡一定要明確指定 +08:00（台灣時區），不能寫沒有時區的naive字串——
// 沒指定時區的日期字串會被當成「伺服器系統時區」的時間解讀，Railway 的容器預設通常是 UTC，
// 會讓 16:00 被誤判成 UTC 16:00（等於台灣時間半夜 00:00），導致下午配送單要晚 8 小時才會被判定逾時。
function periodCutoff(dateStr, period) {
  return new Date(`${dateStr}T${period === 'morning' ? '12:00:00' : '16:00:00'}+08:00`);
}

function isHoliday(dateStr) {
  return !!db.prepare('SELECT 1 FROM board_holidays WHERE date = ?').get(dateStr);
}

// 自動同步台灣國定假日：資料來源是公開維護的 TaiwanCalendar 專案(整理自政府行政機關辦公日曆表)，
// 只挑「isHoliday=true 且不是週六日」的日期匯入(週六日本來就已經跳過，不用重複記)，
// 過年調整放假(補假)也算在內，因為那天司機一樣不會出車。
// 只會覆蓋 source='auto' 的舊資料，超級管理員手動新增/編輯過的假日(source='manual')不會被蓋掉。
async function fetchTaiwanHolidayYear(year) {
  const url = `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`台灣假日資料下載失敗(${year})：HTTP ${res.status}`);
  const days = await res.json();
  return days
    .filter(d => d.isHoliday && d.week !== '六' && d.week !== '日')
    .map(d => ({
      date: `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`,
      note: d.description || '國定假日'
    }));
}

async function syncTaiwanHolidays(years) {
  const upsert = db.prepare(`
    INSERT INTO board_holidays (date, note, source) VALUES (?, ?, 'auto')
    ON CONFLICT(date) DO UPDATE SET note = excluded.note, source = 'auto'
    WHERE board_holidays.source != 'manual'
  `);
  let count = 0;
  for (const year of years) {
    try {
      const list = await fetchTaiwanHolidayYear(year);
      for (const r of list) upsert.run(r.date, r.note);
      count += list.length;
    } catch (e) {
      console.error(`⚠️ 同步台灣假日失敗(${year}年）：${e.message}`);
    }
  }
  return count;
}

function nextAvailableWeekday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const fmt = () => {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6 || isHoliday(fmt())); // 跳過週六日、以及 board_holidays 表裡設定的國定假日
  return fmt();
}

function periodLabel(date, period) {
  return `${date} ${period === 'morning' ? '早上 08:00–12:00' : '下午 13:30–16:00'}`;
}

function autoRescheduleMissedDeliveries() {
  try {
    const now = new Date();
    const rows = db.prepare(`SELECT id, delivery_time FROM board_deliveries WHERE status = '待配送'`).all();
    const update = db.prepare(`UPDATE board_deliveries SET delivery_time = ?, updated_at = datetime('now') WHERE id = ?`);
    const insertLog = db.prepare(`
      INSERT INTO board_status_log (resource_type, resource_id, store_id, from_status, to_status, changed_by)
      SELECT 'delivery', ?, store_id, ?, ?, '系統自動改期' FROM board_deliveries WHERE id = ?
    `);
    let movedCount = 0;
    for (const row of rows) {
      let date = (row.delivery_time || '').slice(0, 10);
      let period = periodOfDeliveryTimeInternal(row.delivery_time);
      if (!date) continue;
      const fromLabel = periodLabel(date, period);
      let moved = false;
      let guard = 0; // 防止異常資料造成無窮迴圈
      while (now >= periodCutoff(date, period) && guard < 60) {
        guard++;
        if (period === 'morning') {
          period = 'afternoon'; // 當天下午
        } else {
          date = nextAvailableWeekday(date); // 下一個可配送日的早上
          period = 'morning';
        }
        moved = true;
      }
      if (moved) {
        const newTime = period === 'morning' ? '08:00' : '13:30';
        update.run(`${date}T${newTime}`, row.id);
        insertLog.run(row.id, fromLabel, periodLabel(date, period), row.id);
        movedCount++;
      }
    }
    if (movedCount > 0) {
      console.log(`⏰ 已自動改期 ${movedCount} 筆逾時未出車的配送單`);
    }
  } catch (e) {
    console.error('❌ 自動改期配送單失敗:', e.message);
  }
}

module.exports = { db, initDatabase, cleanupOldBoardRecords, autoRescheduleMissedDeliveries, syncTaiwanHolidays };
