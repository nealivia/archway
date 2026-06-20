const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 公開 - 取得所有分類
router.get('/', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all();
  res.json({ success: true, data: cats });
});

// 後台 - 新增分類
router.post('/', authenticateToken, (req, res) => {
  const { name, description, sort_order } = req.body;
  if (!name) return res.status(400).json({ success: false, message: '分類名稱為必填' });

  const result = db.prepare('INSERT INTO categories (name, description, sort_order) VALUES (?, ?, ?)').run(name, description || '', sort_order || 0);
  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// 後台 - 更新分類
router.put('/:id', authenticateToken, (req, res) => {
  const { name, description, sort_order } = req.body;
  db.prepare('UPDATE categories SET name = ?, description = ?, sort_order = ? WHERE id = ?').run(name, description || '', sort_order || 0, req.params.id);
  res.json({ success: true, message: '分類更新成功' });
});

// 後台 - 刪除分類
router.delete('/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '分類已刪除' });
});

module.exports = router;
