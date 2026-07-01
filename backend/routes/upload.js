const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// 圖片存到 Volume（/data/uploads），確保目錄存在
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif|pdf)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('只允許上傳圖片（JPG/PNG/WebP）或 PDF'));
  }
});

router.post('/image', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '未上傳檔案' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url, filename: req.file.filename });
});

router.post('/images', authenticateToken, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: '未上傳檔案' });
  const urls = req.files.map(f => `/uploads/${f.filename}`);
  res.json({ success: true, urls });
});

module.exports = router;
