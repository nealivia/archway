const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 送達證明照片：跟 routes/upload.js 共用同一個 Volume 目錄與 /uploads 靜態路徑，
// 上傳後一律壓縮成 WebP（跟產品圖片同一套壓縮邏輯），避免手機拍的原始照片太大占空間。
const PROOF_UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(PROOF_UPLOADS_DIR)) fs.mkdirSync(PROOF_UPLOADS_DIR, { recursive: true });
const proofUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('只允許上傳圖片（JPG/PNG/WebP/GIF）'));
  }
});

// ── 佈告欄需要登入 ──────────────────────────────────────────────────
// store（各分店）、driver（司機，只能切換配送狀態）、super_admin（超級管理員）能存取，一般管理員（admin）不可進入。
router.use(authenticateToken);
router.use((req, res, next) => {
  if (!['store', 'driver', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: '沒有權限存取電子佈告欄' });
  }
  next();
});

// ── 分店身分 ────────────────────────────────────────────────────────
// role = store 的帳號，身分固定為自己帳號綁定的 store_id（不可竄改）。
// role = super_admin（總部人員）可用 Header X-Store-Id 代表操作某分店。
// role = driver（司機）不綁定任何分店，一律回傳 null——這樣所有「需要分店身分」的動作
// （新增/編輯/刪除配送單、缺訂貨、留言）司機都做不了，只留下切換配送狀態這一項特例。
function resolveStoreId(req) {
  if (req.user.role === 'store') return req.user.store_id;
  if (req.user.role === 'driver') return null;
  const hdr = parseInt(req.header('X-Store-Id'), 10);
  return hdr || null;
}

function requireStore(req, res, next) {
  const storeId = resolveStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: '缺少分店身分' });
  }
  const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(storeId);
  if (!store) {
    return res.status(400).json({ success: false, message: '找不到這個分店' });
  }
  req.storeId = storeId;
  next();
}

// 跟 requireStore 不同：不會因為沒有分店身分就擋下來（司機沒有分店，但還是要能呼叫配送單的
// PUT 路由來切換狀態），只是單純把 storeId 算出來掛在 req 上，算不出來就是 null。
function attachStoreId(req, res, next) {
  req.storeId = resolveStoreId(req);
  next();
}

function ownerOnly(getRow) {
  return (req, res, next) => {
    const row = getRow(req);
    if (!row) return res.status(404).json({ success: false, message: '找不到資料' });
    // 超級管理員不受「只能動自己分店資料」限制，可以刪除/編輯任何分店的資料。
    if (req.user.role !== 'super_admin' && row.store_id !== req.storeId) {
      return res.status(403).json({ success: false, message: '只能編輯或刪除自己分店建立的資料' });
    }
    req.resource = row; // 供後續 handler 取用（例如比對狀態是否有變更）
    next();
  };
}

// 狀態有變更時寫入變更紀錄（配送單 / 缺訂貨狀態共用）。storeId 用資源實際所屬的分店（不是操作者），
// 這樣「依分店篩選」歷史紀錄時才會準確——例如和平店幫板橋店的配送單切換狀態，紀錄仍歸在板橋店底下。
function logStatusChange(storeId, changedBy, type, resourceId, fromStatus, toStatus) {
  if (fromStatus === toStatus) return;
  db.prepare(`
    INSERT INTO board_status_log (resource_type, resource_id, store_id, from_status, to_status, changed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type, resourceId, storeId, fromStatus, toStatus, changedBy);
}

// 配送單「內容」被誰改過什麼：跟狀態變更紀錄共用同一張表(board_status_log)，
// resource_type 存 'delivery_edit' 跟一般狀態變更('delivery')區分開來，方便之後萬一資料被改錯能回頭查。
// 只記錄「真的有變」的欄位，不會每次編輯都留一堆沒意義的紀錄。
const DELIVERY_EDIT_FIELDS = [
  ['delivery_time', '配送時間'], ['location', '地點'], ['content', '內容'],
  ['customer_name', '客戶名稱'], ['customer_contact', '客戶聯絡方式'],
  ['transfer_from', '調撥起點'], ['transfer_to', '調撥終點'], ['transfer_item', '調撥貨物']
];
function logDeliveryContentEdit(row, newValues, changedBy) {
  const diffs = [];
  for (const [key, label] of DELIVERY_EDIT_FIELDS) {
    const oldVal = row[key] || '';
    const newVal = newValues[key] || '';
    if (oldVal !== newVal) diffs.push(`${label}：${oldVal || '（空白）'} → ${newVal || '（空白）'}`);
  }
  if (diffs.length === 0) return;
  db.prepare(`
    INSERT INTO board_status_log (resource_type, resource_id, store_id, from_status, to_status, changed_by)
    VALUES ('delivery_edit', ?, ?, NULL, ?, ?)
  `).run(row.id, row.store_id, diffs.join('；'), changedBy);
}

// 配送單「更改狀態」的控制權：所有配送都由和平店（總店）統一控制司機排程，所以只有和平店帳號、
// 司機帳號（driver）、或超級管理員可以切換配送狀態（待配送/配送中/已送達）；
// 其他分店仍可以編輯或刪除自己送出的配送單內容，但一樣不能切換狀態。
function getControlStoreId() {
  const row = db.prepare("SELECT id FROM stores WHERE name = '和平店'").get();
  return row ? row.id : null;
}
function canChangeDeliveryStatus(req) {
  return req.user.role === 'super_admin' || req.user.role === 'driver' || req.storeId === getControlStoreId();
}

// alias：資料表在 SQL 裡的別名（例如 'd'、'c'、'l'）。stores 表本身也有 created_at 欄位，
// 不加別名前綴的話跟 JOIN 進來的 stores.created_at 會產生「ambiguous column name」錯誤。
function buildFilter(req, alias, timeColumn) {
  const { store, from, to } = req.query;
  let sql = ' WHERE 1=1';
  const params = [];
  if (store) { sql += ` AND ${alias}.store_id = ?`; params.push(store); }
  if (from) { sql += ` AND ${alias}.${timeColumn} >= ?`; params.push(from); }
  if (to) { sql += ` AND ${alias}.${timeColumn} <= ?`; params.push(to); }
  return { sql, params };
}

// ================= 配送單 =================
router.get('/deliveries', (req, res) => {
  const { sql, params } = buildFilter(req, 'd', 'delivery_time');
  const rows = db.prepare(`
    SELECT d.*, s.name AS store_name FROM board_deliveries d
    JOIN stores s ON s.id = d.store_id
    ${sql} ORDER BY delivery_time DESC LIMIT 500
  `).all(...params);
  res.json({ success: true, data: rows });
});

// 全公司只有一位配送司機，同一天、同一時段的配送量是全分店共用的額度。
// 前端月曆現在只載入當月資料，所以額度用這支輕量 API 直接向資料庫查詢當天資料，不受月曆載入範圍限制，結果永遠準確。
router.get('/deliveries/slot-count', (req, res) => {
  const { date, period, exclude } = req.query;
  if (!date || !period) {
    return res.status(400).json({ success: false, message: '缺少日期或時段' });
  }
  const excludeId = exclude ? parseInt(exclude, 10) : null;
  const rows = db.prepare(`SELECT id, delivery_time FROM board_deliveries WHERE date(delivery_time) = ?`).all(date);
  const count = rows.filter(r => {
    if (excludeId && r.id === excludeId) return false;
    const hhmm = (r.delivery_time || '').slice(11, 16);
    const p = hhmm < '12:30' ? 'morning' : 'afternoon';
    return p === period;
  }).length;
  res.json({ success: true, count });
});

// 調撥目標除了公司分店（stores 表）以外，還可以選這幾個不是分店的倉庫
const TRANSFER_WAREHOUSES = ['泰山倉', '富友倉'];
function transferTargetNames() {
  const storeNames = db.prepare('SELECT name FROM stores').all().map(s => s.name);
  return [...storeNames, ...TRANSFER_WAREHOUSES];
}

// 配送單分兩種：'客人配送'（要填地點/客戶資訊）跟 '分店調撥'（起點A→終點B，其他欄位不必填；
// 調撥貨物內容非必填——只有從富友倉這類倉庫提貨才需要註明，分店互調可以省略）
function validateDeliveryPayload(body) {
  const delivery_type = body.delivery_type === '分店調撥' ? '分店調撥' : '客人配送';
  if (!body.delivery_time) return { error: '配送時間為必填' };
  if (delivery_type === '分店調撥') {
    if (!body.transfer_from) return { error: '請選擇調撥起點' };
    if (!body.transfer_to) return { error: '請選擇調撥終點' };
    if (!transferTargetNames().includes(body.transfer_from)) return { error: '調撥起點不存在' };
    if (!transferTargetNames().includes(body.transfer_to)) return { error: '調撥終點不存在' };
    if (body.transfer_from === body.transfer_to) return { error: '調撥起點與終點不能相同' };
  } else {
    if (!body.location) return { error: '配送地點為必填' };
  }
  return {
    delivery_type,
    location: delivery_type === '分店調撥' ? '' : (body.location || ''),
    content: delivery_type === '分店調撥' ? '' : (body.content || ''),
    customer_name: delivery_type === '分店調撥' ? '' : (body.customer_name || ''),
    customer_contact: delivery_type === '分店調撥' ? '' : (body.customer_contact || ''),
    transfer_from: delivery_type === '分店調撥' ? body.transfer_from : '',
    transfer_to: delivery_type === '分店調撥' ? body.transfer_to : '',
    transfer_item: delivery_type === '分店調撥' ? (body.transfer_item || '').trim() : ''
  };
}

router.get('/transfer-targets', (req, res) => {
  res.json({ success: true, data: transferTargetNames() });
});

router.post('/deliveries', requireStore, (req, res) => {
  const { delivery_time, status } = req.body;
  const v = validateDeliveryPayload(req.body);
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  const info = db.prepare(`
    INSERT INTO board_deliveries
      (store_id, delivery_time, location, content, status, customer_name, customer_contact, created_by, delivery_type, transfer_from, transfer_to, transfer_item)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.storeId, delivery_time, v.location, v.content, status || '待配送', v.customer_name, v.customer_contact, req.user.username, v.delivery_type, v.transfer_from, v.transfer_to, v.transfer_item);
  res.status(201).json({ success: true, id: info.lastInsertRowid });
});

// 今日配送總覽的司機路線手動排序：全公司只有一位司機，順序是跨分店共用的排程，
// 所以不比對「是不是自己分店的資料」，只要是有權限進佈告欄的帳號都可以調整當天路線順序。
router.put('/deliveries/reorder', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: '缺少排序資料' });
  }
  const update = db.prepare('UPDATE board_deliveries SET sort_order = ? WHERE id = ?');
  ids.forEach((id, idx) => update.run(idx, id));
  res.json({ success: true });
});

// 配送單編輯：內容（地點/客戶資訊/調撥目標等）只有建立的那家分店能改，跟以前一樣；
// 但「狀態」欄位比較特別——全公司配送都由和平店統一控制司機排程，所以狀態變更只有和平店／超級管理員能做，
// 就算是和平店要去改別家分店送出的單，也只准動狀態，其他內容一律不能碰。
router.put('/deliveries/:id', attachStoreId, (req, res) => {
  const row = db.prepare('SELECT * FROM board_deliveries WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: '找不到資料' });

  const { delivery_time, status } = req.body;
  const v = validateDeliveryPayload(req.body);
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  const newStatus = status || '待配送';

  const isOwner = row.store_id === req.storeId;
  const isSuperAdmin = req.user.role === 'super_admin';
  const canChangeStatus = canChangeDeliveryStatus(req);
  const statusChanged = newStatus !== row.status;

  if (statusChanged && !canChangeStatus) {
    return res.status(403).json({ success: false, message: '配送狀態只有和平店（總店）能變更' });
  }
  if (!isOwner && !isSuperAdmin && !canChangeStatus) {
    return res.status(403).json({ success: false, message: '只能編輯或刪除自己分店建立的資料' });
  }
  // 超級管理員不受限制，可以完整編輯任何一筆配送單（內容+狀態）。
  if (!isOwner && !isSuperAdmin && canChangeStatus) {
    // 不是自己分店的資料，只是有狀態控制權：只准變更狀態，內容欄位必須跟原本一致，避免誤改到別店的資料
    const contentUnchanged = delivery_time === row.delivery_time && v.location === row.location &&
      v.content === row.content && v.customer_name === row.customer_name && v.customer_contact === row.customer_contact &&
      v.delivery_type === row.delivery_type && v.transfer_from === (row.transfer_from || '') &&
      v.transfer_to === (row.transfer_to || '') && v.transfer_item === (row.transfer_item || '');
    if (!contentUnchanged) {
      return res.status(403).json({ success: false, message: '只能變更這筆非本店配送單的狀態，其他內容不可修改' });
    }
  }

  db.prepare(`
    UPDATE board_deliveries SET delivery_time = ?, location = ?, content = ?, status = ?,
      customer_name = ?, customer_contact = ?, delivery_type = ?, transfer_from = ?, transfer_to = ?, transfer_item = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(delivery_time, v.location, v.content, newStatus, v.customer_name, v.customer_contact, v.delivery_type, v.transfer_from, v.transfer_to, v.transfer_item, req.params.id);
  logStatusChange(row.store_id, req.user.username, 'delivery', req.params.id, row.status, newStatus);
  logDeliveryContentEdit(row, { delivery_time, ...v }, req.user.username);
  res.json({ success: true, message: '已更新' });
});

router.delete('/deliveries/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_deliveries WHERE id = ?').get(req.params.id)),
  (req, res) => {
    db.prepare('DELETE FROM board_deliveries WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '已刪除' });
  });

// 送達證明照片：跟切換配送狀態同一組人能上傳（司機/和平店/超級管理員），不分是不是自己分店建立的配送單，
// 因為全公司只有一位司機，實際跑單、拍照存證的人本來就不是配送單建立者那家分店。
router.post('/deliveries/:id/proof', attachStoreId, proofUpload.single('photo'), async (req, res) => {
  const row = db.prepare('SELECT * FROM board_deliveries WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: '找不到資料' });
  if (!canChangeDeliveryStatus(req)) {
    return res.status(403).json({ success: false, message: '沒有權限上傳送達證明' });
  }
  if (!req.file) return res.status(400).json({ success: false, message: '未上傳照片' });
  try {
    const filename = `${uuidv4()}.webp`;
    await sharp(req.file.buffer)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(PROOF_UPLOADS_DIR, filename));
    const url = `/uploads/${filename}`;
    db.prepare("UPDATE board_deliveries SET proof_photo = ?, updated_at = datetime('now') WHERE id = ?").run(url, req.params.id);
    res.json({ success: true, url });
  } catch (e) {
    console.error('❌ 送達證明照片處理失敗:', e.message);
    res.status(500).json({ success: false, message: '照片處理失敗' });
  }
});

// ================= 缺訂貨狀態 =================
router.get('/stock', (req, res) => {
  const { sql, params } = buildFilter(req, 'd', 'updated_at');
  const rows = db.prepare(`
    SELECT d.*, s.name AS store_name FROM board_stock d
    JOIN stores s ON s.id = d.store_id
    ${sql} ORDER BY updated_at DESC LIMIT 500
  `).all(...params);
  res.json({ success: true, data: rows });
});

router.post('/stock', requireStore, (req, res) => {
  const { item_name, status, note } = req.body;
  if (!item_name || !status) {
    return res.status(400).json({ success: false, message: '品項與狀態為必填' });
  }
  const info = db.prepare(`
    INSERT INTO board_stock (store_id, item_name, status, note, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.storeId, item_name, status, note || '', req.user.username);
  res.status(201).json({ success: true, id: info.lastInsertRowid });
});

router.put('/stock/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_stock WHERE id = ?').get(req.params.id)),
  (req, res) => {
    const { item_name, status, note } = req.body;
    db.prepare(`
      UPDATE board_stock SET item_name = ?, status = ?, note = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(item_name, status, note || '', req.params.id);
    logStatusChange(req.storeId, req.user.username, 'stock', req.params.id, req.resource.status, status);
    res.json({ success: true, message: '已更新' });
  });

router.delete('/stock/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_stock WHERE id = ?').get(req.params.id)),
  (req, res) => {
    db.prepare('DELETE FROM board_stock WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '已刪除' });
  });

// ================= 留言板 =================
router.get('/comments', (req, res) => {
  const { sql, params } = buildFilter(req, 'c', 'created_at');
  const rows = db.prepare(`
    SELECT c.*, s.name AS store_name FROM board_comments c
    JOIN stores s ON s.id = c.store_id
    ${sql} ORDER BY created_at DESC LIMIT 500
  `).all(...params);
  res.json({ success: true, data: rows });
});

router.post('/comments', requireStore, (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: '留言內容不可為空' });
  }
  const info = db.prepare('INSERT INTO board_comments (store_id, message, created_by) VALUES (?, ?, ?)')
    .run(req.storeId, message.trim(), req.user.username);
  res.status(201).json({ success: true, id: info.lastInsertRowid });
});

router.delete('/comments/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_comments WHERE id = ?').get(req.params.id)),
  (req, res) => {
    db.prepare('DELETE FROM board_comments WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '已刪除' });
  });

// ================= 狀態變更紀錄 =================
router.get('/status-log', (req, res) => {
  const { sql, params } = buildFilter(req, 'l', 'created_at');
  const rows = db.prepare(`
    SELECT l.*, s.name AS store_name FROM board_status_log l
    JOIN stores s ON s.id = l.store_id
    ${sql} ORDER BY created_at DESC LIMIT 500
  `).all(...params);
  res.json({ success: true, data: rows });
});

// ================= 匯出 CSV（Excel 可直接開啟）=================
// 用 CSV 而不是真的 .xlsx 二進位格式：不用額外套件、內容單純、Excel 雙擊就能開，維護起來也最不容易出錯。
function csvCell(v) {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function csvRow(arr) {
  return arr.map(csvCell).join(',');
}
function transferSummary(d) {
  const from = d.transfer_from || d.store_name || '';
  const to = d.transfer_to || '';
  return `${from} → ${to}${d.transfer_item ? `（${d.transfer_item}）` : ''}`;
}

router.get('/export', (req, res) => {
  const deliveriesQ = buildFilter(req, 'd', 'delivery_time');
  const stockQ = buildFilter(req, 'd', 'updated_at');
  const commentsQ = buildFilter(req, 'c', 'created_at');
  const logQ = buildFilter(req, 'l', 'created_at');

  const deliveries = db.prepare(`
    SELECT d.*, s.name AS store_name FROM board_deliveries d
    JOIN stores s ON s.id = d.store_id
    ${deliveriesQ.sql} ORDER BY d.delivery_time
  `).all(...deliveriesQ.params);
  const stock = db.prepare(`
    SELECT d.*, s.name AS store_name FROM board_stock d
    JOIN stores s ON s.id = d.store_id
    ${stockQ.sql} ORDER BY d.updated_at
  `).all(...stockQ.params);
  const comments = db.prepare(`
    SELECT c.*, s.name AS store_name FROM board_comments c
    JOIN stores s ON s.id = c.store_id
    ${commentsQ.sql} ORDER BY c.created_at
  `).all(...commentsQ.params);
  const statusLog = db.prepare(`
    SELECT l.*, s.name AS store_name FROM board_status_log l
    JOIN stores s ON s.id = l.store_id
    ${logQ.sql} ORDER BY l.created_at
  `).all(...logQ.params);

  // 配送單時間存的是 'T' 分隔（例如 2026-09-26T08:00），其他表則是 SQLite datetime('now') 的空白分隔格式，
  // 統一成空白分隔再排序/輸出，不然字串排序會把同一天的資料排錯順序（' ' 在 ASCII 排序上比 'T' 小）。
  const normalizeTime = (dt) => (dt || '').replace('T', ' ');

  const rows = [];
  for (const d of deliveries) {
    const content = d.delivery_type === '分店調撥' ? transferSummary(d) : `${d.location}${d.customer_name ? `／${d.customer_name}` : ''}`;
    rows.push([normalizeTime(d.delivery_time), d.delivery_type === '分店調撥' ? '分店調撥' : '配送單', d.store_name, content, d.status, d.created_by]);
  }
  for (const s of stock) {
    rows.push([s.updated_at, '缺訂貨', s.store_name, `${s.item_name}${s.note ? `／${s.note}` : ''}`, s.status, s.created_by]);
  }
  for (const c of comments) {
    rows.push([c.created_at, '留言', c.store_name, c.message, '', c.created_by]);
  }
  for (const l of statusLog) {
    rows.push([l.created_at, '狀態變更', l.store_name, `${l.from_status || ''} → ${l.to_status}`, '', l.changed_by]);
  }
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  rows.unshift(['時間', '類型', '分店', '內容', '狀態', '上傳者/操作人']);

  // 開頭加 UTF-8 BOM，不然 Excel 開啟中文 CSV 常常會顯示成亂碼
  const csv = '﻿' + rows.map(csvRow).join('\r\n');
  const filename = `board-export-${(req.query.from || '全部')}_${(req.query.to || '')}.csv`.replace(/[:/\\]/g, '-');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});

module.exports = router;
