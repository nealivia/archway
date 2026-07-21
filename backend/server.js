require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

// ── JWT_SECRET 強度驗證（啟動時檢查）────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET.includes('請替換')) {
  console.error('❌ 致命錯誤：JWT_SECRET 未設定或強度不足（至少 32 字元）');
  console.error('   請在 Railway 環境變數或 .env 中設定強隨機字串');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// ── 輕量 Rate Limiter（不需外部套件）───────────────────────────────────────
function createRateLimiter({ windowMs, max, message }) {
  const store = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) { if (now > v.reset) store.delete(k); }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.reset) {
      store.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

// 一般 API：每 IP 每 15 分鐘最多 300 次
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: '請求過於頻繁，請稍後再試'
});

// 登入端點：每 IP 每 15 分鐘最多 20 次（防自動化攻擊）
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: '登入請求過於頻繁，請 15 分鐘後再試'
});

// 初始化資料庫
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案 - 上傳的圖片（優先使用 Volume 路徑）
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// API 路由（含速率限制）
app.use('/api/auth/login', loginLimiter);   // 登入端點：嚴格限制
app.use('/api/auth/2fa', loginLimiter);     // 2FA 驗證：同等限制
app.use('/api', apiLimiter);               // 所有 API：一般限制
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users', require('./routes/users'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/stores', require('./routes/stores'));

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ✅ 提供 React 前端靜態檔案（production build）
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// ✅ 所有非 API 路由都交給 React Router 處理
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 全域錯誤處理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '伺服器錯誤'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器啟動於 http://localhost:${PORT}`);
});
