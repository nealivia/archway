// 國定假日清單管理（僅超級管理員）：自動改期(nextAvailableWeekday, 見 database.js)判斷「下一個可配送日」時，
// 除了跳過週六日，也會跳過這裡設定的日期，避免逾時未出車的配送單被自動排到國定假日。
const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

router.use(authenticateToken, requireSuperAdmin);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT date, note FROM board_holidays ORDER BY date').all();
  res.json({ success: true, data: rows });
});

router.post('/', (req, res) => {
  const { date, note } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: '日期格式錯誤，需為 YYYY-MM-DD' });
  }
  db.prepare(`
    INSERT INTO board_holidays (date, note) VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET note = excluded.note
  `).run(date, (note || '').trim());
  res.status(201).json({ success: true });
});

router.delete('/:date', (req, res) => {
  db.prepare('DELETE FROM board_holidays WHERE date = ?').run(req.params.date);
  res.json({ success: true });
});

module.exports = router;
