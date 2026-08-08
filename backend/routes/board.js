const express = require('express');
const router = express.Router();
const { db } = require('../database');

// ── 分店身分（簡易版）──────────────────────────────────────────────
// 佈告欄是內部工具，不走 JWT 帳號系統。前端會在寫入類請求的
// Header 帶上 X-Store-Id（對應 stores 表的 id），代表目前操作者所屬分店。
// 這不是密碼保護，只是標示「這筆資料屬於哪一店」，並限制
// 「只能編輯/刪除自己分店建立的資料」。
function requireStore(req, res, next) {
  const storeId = parseInt(req.header('X-Store-Id'), 10);
  if (!storeId) {
    return res.status(400).json({ success: false, message: '缺少分店身分（X-Store-Id）' });
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
    next();
  };
}

function buildFilter(req, timeColumn) {
  const { store, from, to } = req.query;
  let sql = ' WHERE 1=1';
  const params = [];
  if (store) { sql += ' AND store_id = ?'; params.push(store); }
  if (from) { sql += ` AND ${timeColumn} >= ?`; params.push(from); }
  if (to) { sql += ` AND ${timeColumn} <= ?`; params.push(to); }
  return { sql, params };
}

// ================= 配送單 =================
router.get('/deliveries', (req, res) => {
  const { sql, params } = buildFilter(req, 'delivery_time');
  const rows = db.prepare(`
    SELECT d.*, s.name AS store_name FROM board_deliveries d
    JOIN stores s ON s.id = d.store_id
    ${sql} ORDER BY delivery_time DESC
  `).all(...params);
  res.json({ success: true, data: rows });
});

router.post('/deliveries', requireStore, (req, res) => {
  const { delivery_time, location, content, status } = req.body;
  if (!delivery_time || !location) {
    return res.status(400).json({ success: false, message: '配送時間與地點為必填' });
  }
  const info = db.prepare(`
    INSERT INTO board_deliveries (store_id, delivery_time, location, content, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.storeId, delivery_time, location, content || '', status || '待配送');
  res.status(201).json({ success: true, id: info.lastInsertRowid });
});

router.put('/deliveries/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_deliveries WHERE id = ?').get(req.params.id)),
  (req, res) => {
    const { delivery_time, location, content, status } = req.body;
    db.prepare(`
      UPDATE board_deliveries SET delivery_time = ?, location = ?, content = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(delivery_time, location, content || '', status || '待配送', req.params.id);
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
  const { sql, params } = buildFilter(req, 'updated_at');
  const rows = db.prepare(`
    SELECT d.*, s.name AS store_name FROM board_stock d
    JOIN stores s ON s.id = d.store_id
    ${sql} ORDER BY updated_at DESC
  `).all(...params);
  res.json({ success: true, data: rows });
});

router.post('/stock', requireStore, (req, res) => {
  const { item_name, status, note } = req.body;
  if (!item_name || !status) {
    return res.status(400).json({ success: false, message: '品項與狀態為必填' });
  }
  const info = db.prepare(`
    INSERT INTO board_stock (store_id, item_name, status, note)
    VALUES (?, ?, ?, ?)
  `).run(req.storeId, item_name, status, note || '');
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
  const { sql, params } = buildFilter(req, 'created_at');
  const rows = db.prepare(`
    SELECT c.*, s.name AS store_name FROM board_comments c
    JOIN stores s ON s.id = c.store_id
    ${sql} ORDER BY created_at DESC
  `).all(...params);
  res.json({ success: true, data: rows });
});

router.post('/comments', requireStore, (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: '留言內容不可為空' });
  }
  const info = db.prepare('INSERT INTO board_comments (store_id, message) VALUES (?, ?)')
    .run(req.storeId, message.trim());
  res.status(201).json({ success: true, id: info.lastInsertRowid });
});

router.delete('/comments/:id', requireStore,
  ownerOnly(req => db.prepare('SELECT * FROM board_comments WHERE id = ?').get(req.params.id)),
  (req, res) => {
    db.prepare('DELETE FROM board_comments WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: '已刪除' });
  });

module.exports = router;
