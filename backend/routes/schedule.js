// 員工排班表（月休表）：各分店自己排自己員工的休假/病假/支援其他分店，全公司共用同一份檢視，
// 讓大家都看得到彼此的人力狀況，方便互相調度支援。
const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 佈告欄角色才能用：store（各分店）、driver（司機，唯讀）、super_admin（可排全部）。
router.use(authenticateToken);
router.use((req, res, next) => {
  if (!['store', 'driver', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: '沒有權限存取排班表' });
  }
  next();
});

// role=store 的帳號身分固定是自己綁定的分店；super_admin 可用 Header X-Store-Id 代表操作某分店
// （新增員工/編輯排班用）；driver 沒有分店身分，一律 null（排班表對司機是唯讀）。
function resolveStoreId(req) {
  if (req.user.role === 'store') return req.user.store_id;
  if (req.user.role === 'driver') return null;
  const hdr = parseInt(req.header('X-Store-Id'), 10);
  return hdr || null;
}

// ── 員工名單 ──────────────────────────────────────────────────────────
router.get('/employees', (req, res) => {
  const rows = db.prepare(`
    SELECT e.id, e.name, e.store_id, e.active, s.name AS store_name
    FROM board_employees e JOIN stores s ON s.id = e.store_id
    WHERE e.active = 1
    ORDER BY s.name, e.name
  `).all();
  res.json({ success: true, data: rows });
});

router.post('/employees', (req, res) => {
  const storeId = resolveStoreId(req);
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, message: '請輸入員工姓名' });
  if (!storeId) return res.status(400).json({ success: false, message: '缺少分店身分，無法新增員工' });
  const store = db.prepare('SELECT id FROM stores WHERE id = ?').get(storeId);
  if (!store) return res.status(400).json({ success: false, message: '找不到這個分店' });
  const info = db.prepare('INSERT INTO board_employees (store_id, name) VALUES (?, ?)').run(storeId, name.trim());
  res.status(201).json({ success: true, id: Number(info.lastInsertRowid) });
});

router.delete('/employees/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM board_employees WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, message: '找不到這個員工' });
  const storeId = resolveStoreId(req);
  if (req.user.role !== 'super_admin' && row.store_id !== storeId) {
    return res.status(403).json({ success: false, message: '只能移除自己分店的員工' });
  }
  // 軟刪除：保留歷史排班紀錄可查，只是名單上不再顯示/不能再排新班
  db.prepare('UPDATE board_employees SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── 月休表 ────────────────────────────────────────────────────────────
// month 格式 YYYY-MM，回傳當月所有員工的排班紀錄（全公司共用檢視，不分分店）
router.get('/entries', (req, res) => {
  const month = req.query.month;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, message: '月份格式錯誤，需為 YYYY-MM' });
  }
  const rows = db.prepare(`
    SELECT employee_id, date, status, support_store_id, note
    FROM board_schedule
    WHERE date LIKE ?
  `).all(`${month}-%`);
  res.json({ success: true, data: rows });
});

// 新增/更新/清除某員工某天的排班狀態。status 傳 null 或空字串 = 清除紀錄（恢復成「正常上班」）
router.put('/entries', (req, res) => {
  const { employee_id, date, status, support_store_id, note } = req.body;
  if (!employee_id || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: '缺少必要參數' });
  }
  const employee = db.prepare('SELECT * FROM board_employees WHERE id = ?').get(employee_id);
  if (!employee) return res.status(404).json({ success: false, message: '找不到這個員工' });
  const storeId = resolveStoreId(req);
  if (req.user.role !== 'super_admin' && employee.store_id !== storeId) {
    return res.status(403).json({ success: false, message: '只能排自己分店員工的班' });
  }

  if (!status) {
    db.prepare('DELETE FROM board_schedule WHERE employee_id = ? AND date = ?').run(employee_id, date);
    return res.json({ success: true });
  }
  if (!['off', 'sick', 'support'].includes(status)) {
    return res.status(400).json({ success: false, message: '狀態錯誤' });
  }
  if (status === 'support' && !support_store_id) {
    return res.status(400).json({ success: false, message: '請選擇要支援的分店' });
  }
  db.prepare(`
    INSERT INTO board_schedule (employee_id, date, status, support_store_id, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, date) DO UPDATE SET
      status = excluded.status, support_store_id = excluded.support_store_id,
      note = excluded.note, created_by = excluded.created_by
  `).run(employee_id, date, status, status === 'support' ? support_store_id : null, (note || '').trim(), req.user.username);
  res.json({ success: true });
});

module.exports = router;
