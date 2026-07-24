const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// 公開 - 取得所有上架商品
router.get('/', (req, res) => {
  const { category_id, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = ['p.is_active = 1'];
  let params = [];

  if (category_id) {
    where.push('p.category_id = ?');
    params.push(category_id);
  }
  if (search) {
    where.push('(p.name LIKE ? OR p.short_desc LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM products p ${whereClause}`).get(...params);
  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ORDER BY c.sort_order ASC, c.name ASC, p.created_at ASC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  const parsed = products.map(p => ({
    ...p,
    features: JSON.parse(p.features || '[]'),
    applications: JSON.parse(p.applications || '[]'),
    images: JSON.parse(p.images || '[]'),
    prices: JSON.parse(p.prices || '[]'),
    colors: JSON.parse(p.colors || '[]')
  }));

  res.json({ success: true, data: parsed, total: total.c, page: Number(page), limit: Number(limit) });
});

// 公開 - 取得精選商品（首頁用，must be before /:id）
router.get('/featured', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND p.is_featured = 1
    ORDER BY c.sort_order ASC, c.name ASC, p.created_at ASC
    LIMIT 3
  `).all();

  const parsed = products.map(p => ({
    ...p,
    features: JSON.parse(p.features || '[]'),
    applications: JSON.parse(p.applications || '[]'),
    images: JSON.parse(p.images || '[]'),
    prices: JSON.parse(p.prices || '[]'),
    colors: JSON.parse(p.colors || '[]')
  }));

  res.json({ success: true, data: parsed });
});

// 公開 - 取得單一商品
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  res.json({
    success: true,
    data: {
      ...product,
      features: JSON.parse(product.features || '[]'),
      applications: JSON.parse(product.applications || '[]'),
      images: JSON.parse(product.images || '[]'),
      prices: JSON.parse(product.prices || '[]'),
      colors: JSON.parse(product.colors || '[]')
    }
  });
});

// 後台 - 取得所有商品（含下架）
router.get('/admin/all', authenticateToken, (req, res) => {
  const { category_id, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let where = [];
  let params = [];

  if (category_id) {
    where.push('p.category_id = ?');
    params.push(category_id);
  }
  if (search) {
    where.push('(p.name LIKE ? OR p.short_desc LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as c FROM products p ${whereClause}`).get(...params);
  const featuredTotal = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_featured = 1').get();
  const products = db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ORDER BY c.sort_order ASC, c.name ASC, p.created_at ASC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  const parsed = products.map(p => ({
    ...p,
    features: JSON.parse(p.features || '[]'),
    applications: JSON.parse(p.applications || '[]'),
    images: JSON.parse(p.images || '[]'),
    prices: JSON.parse(p.prices || '[]'),
    colors: JSON.parse(p.colors || '[]')
  }));

  res.json({ success: true, data: parsed, total: total.c, featuredTotal: featuredTotal.c });
});

// 後台 - 新增商品
router.post('/', authenticateToken, (req, res) => {
  const { name, category_id, short_desc, description, features, applications, shopee_url, images, datasheet_url, installation_url, report_url, youtube_url, colors, is_active, is_featured, price, prices, sort_order } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: '商品名稱為必填' });
  }

  const stmt = db.prepare(`
    INSERT INTO products (name, category_id, short_desc, description, features, applications, shopee_url, images, datasheet_url, installation_url, report_url, youtube_url, colors, is_active, is_featured, price, prices, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name,
    category_id || null,
    short_desc || '',
    description || '',
    JSON.stringify(features || []),
    JSON.stringify(applications || []),
    shopee_url || '',
    JSON.stringify(images || []),
    datasheet_url || '',
    installation_url || '',
    report_url || '',
    youtube_url || '',
    JSON.stringify(colors || []),
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    is_featured ? 1 : 0,
    price ? Number(price) : 0,
    JSON.stringify(prices || []),
    sort_order || 0
  );

  db.prepare('INSERT INTO activity_log (user_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.user.id, 'CREATE', 'product', result.lastInsertRowid, `新增商品: ${name}`
  );

  res.status(201).json({ success: true, id: result.lastInsertRowid, message: '商品新增成功' });
});

// 後台 - 更新商品
router.put('/:id', authenticateToken, (req, res) => {
  const { name, category_id, short_desc, description, features, applications, shopee_url, images, datasheet_url, installation_url, report_url, youtube_url, colors, is_active, is_featured, price, prices, sort_order } = req.body;

  const existing = db.prepare('SELECT id, is_featured FROM products WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  // 精選商品上限 3 個：若本商品原本不是精選，但要設為精選，先檢查數量
  if (is_featured && !existing.is_featured) {
    const featuredCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_featured = 1').get();
    if (featuredCount.c >= 3) {
      return res.status(400).json({ success: false, message: '精選商品已達上限（3 個），請先取消其他商品的精選後再設定。' });
    }
  }

  db.prepare(`
    UPDATE products SET
      name = ?, category_id = ?, short_desc = ?, description = ?,
      features = ?, applications = ?, shopee_url = ?,
      images = ?, datasheet_url = ?, installation_url = ?, report_url = ?, youtube_url = ?, colors = ?, is_active = ?, is_featured = ?, price = ?, prices = ?, sort_order = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name, category_id || null, short_desc || '', description || '',
    JSON.stringify(features || []),
    JSON.stringify(applications || []),
    shopee_url || '',
    JSON.stringify(images || []),
    datasheet_url || '',
    installation_url || '',
    report_url || '',
    youtube_url || '',
    JSON.stringify(colors || []),
    is_active ? 1 : 0,
    is_featured ? 1 : 0,
    price ? Number(price) : 0,
    JSON.stringify(prices || []),
    sort_order || 0,
    req.params.id
  );

  db.prepare('INSERT INTO activity_log (user_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.user.id, 'UPDATE', 'product', req.params.id, `更新商品: ${name}`
  );

  res.json({ success: true, message: '商品更新成功' });
});

// 後台 - 刪除商品
router.delete('/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT id, name FROM products WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: '商品不存在' });
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

  db.prepare('INSERT INTO activity_log (user_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?)').run(
    req.user.id, 'DELETE', 'product', req.params.id, `刪除商品: ${existing.name}`
  );

  res.json({ success: true, message: '商品已刪除' });
});

module.exports = router;
