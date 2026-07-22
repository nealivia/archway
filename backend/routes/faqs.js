const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 公開 - 取得啟用中的 FAQ（依分類分組）
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM faqs WHERE is_active = 1
    ORDER BY category, sort_order ASC, id ASC
  `).all();

  const map = {};
  for (const r of rows) {
    if (!map[r.category]) map[r.category] = [];
    map[r.category].push({ id: r.id, q: r.question, a: r.answer });
  }
  const data = Object.entries(map).map(([category, questions]) => ({ category, questions }));
  res.json({ success: true, data });
});

// 後台 - 取得所有 FAQ（含停用）
router.get('/admin/all', authenticateToken, (req, res) => {
  const data = db.prepare('SELECT * FROM faqs ORDER BY category, sort_order ASC, id ASC').all();
  res.json({ success: true, data });
});

// 後台 - 新增
router.post('/', authenticateToken, (req, res) => {
  const { category, question, answer, sort_order, is_active } = req.body;
  if (!category?.trim() || !question?.trim())
    return res.status(400).json({ success: false, message: '分類與問題為必填' });

  const result = db.prepare(`
    INSERT INTO faqs (category, question, answer, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?)
  `).run(category.trim(), question.trim(), answer?.trim() || '', Number(sort_order) || 0, is_active !== false ? 1 : 0);

  res.status(201).json({ success: true, id: result.lastInsertRowid, message: '新增成功' });
});

// 後台 - 更新
router.put('/:id', authenticateToken, (req, res) => {
  const { category, question, answer, sort_order, is_active } = req.body;
  const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'FAQ 不存在' });

  db.prepare(`
    UPDATE faqs SET category = ?, question = ?, answer = ?, sort_order = ?, is_active = ?,
    updated_at = datetime('now') WHERE id = ?
  `).run(
    category?.trim() || '', question?.trim() || '', answer?.trim() || '',
    Number(sort_order) || 0, is_active ? 1 : 0, req.params.id
  );
  res.json({ success: true, message: '更新成功' });
});

// 後台 - 刪除
router.delete('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, message: 'FAQ 不存在' });
  db.prepare('DELETE FROM faqs WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '已刪除' });
});

module.exports = router;
