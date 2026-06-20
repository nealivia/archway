const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, generateToken } = require('../middleware/auth');

// 登入
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '請填寫帳號與密碼' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });
  }

  const token = generateToken(user);

  // 記錄登入
  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    user.id, 'LOGIN', `使用者 ${user.username} 登入`
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

// 取得當前使用者資訊
router.get('/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// 修改密碼
router.put('/change-password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: '請填寫完整' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: '新密碼至少需要 8 個字元' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!bcrypt.compareSync(oldPassword, user.password_hash)) {
    return res.status(400).json({ success: false, message: '舊密碼錯誤' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, req.user.id);

  res.json({ success: true, message: '密碼修改成功' });
});

module.exports = router;
