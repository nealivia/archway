const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

// 取得所有用戶（僅超級管理員）
router.get('/', authenticateToken, requireSuperAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, is_active, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ success: true, data: users });
});

// 新增用戶（僅超級管理員）
router.post('/', authenticateToken, requireSuperAdmin, (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: '帳號、信箱、密碼為必填' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: '密碼至少需要 8 個字元' });
  }
  if (!['admin', 'super_admin'].includes(role)) {
    return res.status(400).json({ success: false, message: '無效的角色' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ success: false, message: '帳號或信箱已存在' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, hash, role || 'admin');

  db.prepare('INSERT INTO activity_log (user_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.user.id, 'CREATE', 'user', result.lastInsertRowid, `新增用戶: ${username}`
  );

  res.status(201).json({ success: true, id: result.lastInsertRowid, message: '用戶新增成功' });
});

// 更新用戶（僅超級管理員）
router.put('/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  const { email, role, is_active, password } = req.body;
  const userId = req.params.id;

  // 不允許停用自己
  if (Number(userId) === req.user.id && is_active === false) {
    return res.status(400).json({ success: false, message: '無法停用自己的帳號' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, message: '用戶不存在' });

  let passwordHash = user.password_hash;
  if (password) {
    if (password.length < 8) return res.status(400).json({ success: false, message: '密碼至少需要 8 個字元' });
    passwordHash = bcrypt.hashSync(password, 10);
  }

  db.prepare(`
    UPDATE users SET email = ?, role = ?, is_active = ?, password_hash = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(email || user.email, role || user.role, is_active !== undefined ? (is_active ? 1 : 0) : user.is_active, passwordHash, userId);

  res.json({ success: true, message: '用戶更新成功' });
});

// 刪除用戶（僅超級管理員，不能刪自己）
router.delete('/:id', authenticateToken, requireSuperAdmin, (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, message: '無法刪除自己的帳號' });
  }

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: '用戶不存在' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '用戶已刪除' });
});

// 取得操作記錄（僅超級管理員）
router.get('/activity-log', authenticateToken, requireSuperAdmin, (req, res) => {
  const logs = db.prepare(`
    SELECT l.*, u.username FROM activity_log l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC LIMIT 200
  `).all();
  res.json({ success: true, data: logs });
});

module.exports = router;
