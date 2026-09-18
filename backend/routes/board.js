const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// ── 佈告欄需要登入 ──────────────────────────────────────────────────
// 只有 store（各分店）與 super_admin（超級管理員）能存取，一般管理員（admin）不可進入。
router.use(authenticateToken);
router.use((req, res, next) => {
  if (req.user.role !== 'store' && req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: '沒有權限存取電子佈告欄' });
  }
  next();
});

// ── 分店身分 ────────────────────────────────────────────────────────
// role = store 的帳號，身分固定為自己帳號綁定的 store_id（不可竄改）。
// role = super_admin（總部人員）可用 Header X-Store-Id 代表操作某分店。
function resolveStoreId(req) {
  if (req.user.role === 'store') return req.user.store_id;
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

function ownerOnly(getRow) {
  return (req, res, next) => {
    const row = getRow(req);
    if (!row) return res.status(404).json({ success: false, message: '找不到資料' });
    if (row.store_id !== req.storeId) {
      return res.status(403).json({ success: false, message: '只能編輯或刪除自己分店建立的資料' });
    }
    req.resource = row; // 供後續 handler 取用（例如比對狀態是否有變更）
    next();
  };
}

// 狀態有變更時寫入變更紀錄（配送單 / 缺訂貨狀態共用）
function logStatusChange(req, type, resourceId, fromStatus, toStatus) {
  if (fromStatus === toStatus) return;
  db.prepare(`
    INSERT INTO board_status_log (resource_type, resource_id, store_id, from_status, to_status, changed_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(type, resourceId, req.storeId, fromStatus, toStatus, req.user.username);
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

// 配送單分兩種：'客人配送'（要填地點/客戶資訊）跟 '分店調撥'（只需要目標分店跟時間，其他欄位不必填）
function validateDeliveryPayload(body) {
  const delivery_type = body.delivery_type === '分店調撥' ? '分店調撥' : '客人配送';
  if (!body.delivery_time) return { error: '配送時間為必填' };
  if (delivery_type === '分店調撥') {
    if (!body.transfer_to_store_id) return { error: '請選擇調撥目標分店' };
  } else {
    if (!body.location) return { error: '配送地點為必填' };
  }
  return {
    delivery_type,
    location: delivery_type === '分店調撥' ? '' : (body.location || ''),
    content: delivery_type === '分店調撥' ? '' : (body.content || ''),
    customer_name: delivery_type === '分店調撥' ? '' : (body.customer_name || ''),
    customer_contact: delivery_type === '分店調撥' ? '' : (body.customer_contact || ''),
    transfer_to_store_id: delivery_type === '分店調撥' ? parseInt(body.transfer_to_store_id, 10) : null
  };
}

router.post('/deliveries', requireStore, (req, res) => {
  const { delivery_time, status } = req.body;
  const v = validateDeliveryPayload(req.body);
  if (v.error) return res.status(400).json({ success: false, message: v.error });
  const info = db.prepare(`
    INSERT INTO board_deliveries
      (store_id, delivery_time, location, content, status, customer_name, customer_contact, created_by, delivery_type, transfer_to_store_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.storeId, delivery_time, v.location, v.content, status || '待配送', v.customer_name, v.customer_contact, req.user.username, v.delivery_type, v.transfer_to_store_id);
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

router.put('/deliveries/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_deliveries WHERE id = ?').get(req.params.id)),
  (req, res) => {
    const { delivery_time, status } = req.body;
    const v = validateDeliveryPayload(req.body);
    if (v.error) return res.status(400).json({ success: false, message: v.error });
    const newStatus = status || '待配送';
    db.prepare(`
      UPDATE board_deliveries SET delivery_time = ?, location = ?, content = ?, status = ?,
        customer_name = ?, customer_contact = ?, delivery_type = ?, transfer_to_store_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(delivery_time, v.location, v.content, newStatus, v.customer_name, v.customer_contact, v.delivery_type, v.transfer_to_store_id, req.params.id);
    logStatusChange(req, 'delivery', req.params.id, req.resource.status, newStatus);
    res.json({ success: true, message: '已更新' });
  });

router.delete('/deliveries/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_deliveries WHERE id = ?').get(req.params.id)),
  (req, res) => {
    db.prepare('DELETE FROM board_deliveries WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '已刪除' });
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
    logStatusChange(req, 'stock', req.params.id, req.resource.status, status);
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

module.exports = router;
