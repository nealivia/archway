// 國定假日清單管理（僅超級管理員）：自動改期(nextAvailableWeekday, 見 database.js)判斷「下一個可配送日」時，
// 除了跳過週六日，也會跳過這裡設定的日期，避免逾時未出車的配送單被自動排到國定假日。
const express = require('express');
const router = express.Router();
const { db, syncTaiwanHolidays } = require('../database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

// 查詢清單開放給所有已登入的佈告欄使用者（分店/司機/超級管理員），
// 讓月曆能標示假日；新增/刪除假日仍僅限超級管理員。
router.use(authenticateToken);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT date, note, source FROM board_holidays ORDER BY date').all();
  res.json({ success: true, data: rows });
});

// 手動新增/編輯的假日一律標記 source='manual'，之後系統自動同步台灣假日時不會覆蓋這筆
router.post('/', requireSuperAdmin, (req, res) => {
  const { date, note } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, message: '日期格式錯誤，需為 YYYY-MM-DD' });
  }
  db.prepare(`
    INSERT INTO board_holidays (date, note, source) VALUES (?, ?, 'manual')
    ON CONFLICT(date) DO UPDATE SET note = excluded.note, source = 'manual'
  `).run(date, (note || '').trim());
  res.status(201).json({ success: true });
});

router.delete('/:date', requireSuperAdmin, (req, res) => {
  db.prepare('DELETE FROM board_holidays WHERE date = ?').run(req.params.date);
  res.json({ success: true });
});

// 手動觸發立即同步台灣國定假日（一般不用手動點，伺服器每天會自動跑一次；
// 這裡是給超級管理員萬一急著要看到最新資料時可以立刻刷新用）
router.post('/sync-taiwan', requireSuperAdmin, async (req, res) => {
  try {
    const y = new Date().getFullYear();
    const count = await syncTaiwanHolidays([y, y + 1]);
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || '同步失敗' });
  }
});

module.exports = router;
