const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

// 公開：取得維護模式狀態
router.get('/maintenance', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
  res.json({ maintenance: row?.value === 'true' });
});

// 後台：切換維護模式（僅 super_admin）
router.post('/maintenance', authenticateToken, requireSuperAdmin, (req, res) => {
  const { enabled } = req.body;
  db.prepare("UPDATE settings SET value = ?, updated_at = datetime('now') WHERE key = 'maintenance_mode'")
    .run(enabled ? 'true' : 'false');
  res.json({ success: true, maintenance: !!enabled });
});

module.exports = router;
