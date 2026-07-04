const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 公開 - 取得上架中門市（排序）
router.get('/', (req, res) => {
  const stores = db.prepare('SELECT * FROM stores WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json({ success: true, data: stores });
});

// 後台 - 取得全部門市（含下架）
router.get('/all', authenticateToken, (req, res) => {
  const stores = db.prepare('SELECT * FROM stores ORDER BY sort_order ASC, id ASC').all();
  res.json({ success: true, data: stores });
});

// 後台 - 新增門市
router.post('/', authenticateToken, (req, res) => {
  const { name, address, phone, hours, sort_order, is_active } = req.body;
  if (!name) return res.status(400).json({ success: false, message: '門市名稱為必填' });

  const result = db.prepare(
    'INSERT INTO stores (name, address, phone, hours, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, address || '', phone || '', hours || '', sort_order || 0, is_active !== false ? 1 : 0);

  res.status(201).json({ success: true, id: result.lastInsertRowid });
});

// 後台 - 更新門市
router.put('/:id', authenticateToken, (req, res) => {
  const { name, address, phone, hours, sort_order, is_active } = req.body;
  if (!name) return res.status(400).json({ success: false, message: '門市名稱為必填' });

  db.prepare(
    'UPDATE stores SET name = ?, address = ?, phone = ?, hours = ?, sort_order = ?, is_active = ? WHERE id = ?'
  ).run(name, address || '', phone || '', hours || '', sort_order || 0, is_active ? 1 : 0, req.params.id);

  res.json({ success: true, message: '門市更新成功' });
});

// 後台 - 刪除門市
router.delete('/:id', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM stores WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '門市已刪除' });
});

module.exports = router;
