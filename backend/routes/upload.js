const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

// 圖片存到 Volume（/data/uploads），確保目錄存在
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── 圖片：用 memoryStorage，上傳後壓縮存 WebP ───────────────────────────────
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 原始最大 30MB
  fileFilter: (req, file, cb) => {
    if (/\.(jpg|jpeg|png|webp|gif)$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('只允許上傳圖片（JPG/PNG/WebP/GIF）'));
  }
});

// 壓縮圖片：最大 1920px，轉 WebP，品質 82%
async function compressImage(buffer) {
  const filename = `${uuidv4()}.webp`;
  const filepath = path.join(UPLOADS_DIR, filename);
  await sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(filepath);
  return filename;
}

router.post('/image', authenticateToken, imageUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '未上傳檔案' });
  try {
    const filename = await compressImage(req.file.buffer);
    res.json({ success: true, url: `/uploads/${filename}`, filename });
  } catch (err) {
    console.error('圖片壓縮失敗:', err);
    res.status(500).json({ success: false, message: '圖片處理失敗' });
  }
});

router.post('/images', authenticateToken, imageUpload.array('images', 10), async (req, res) => {
  if (!req.files || req.files.length === 0)
    return res.status(400).json({ success: false, message: '未上傳檔案' });
  try {
    const urls = await Promise.all(
      req.files.map(async f => {
        const filename = await compressImage(f.buffer);
        return `/uploads/${filename}`;
      })
    );
    res.json({ success: true, urls });
  } catch (err) {
    console.error('圖片壓縮失敗:', err);
    res.status(500).json({ success: false, message: '圖片處理失敗' });
  }
});

// ─── PDF：保留原始 diskStorage ───────────────────────────────────────────────
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}.pdf`)
});

const pdfUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/\.pdf$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('只允許上傳 PDF 檔案'));
  }
});

router.post('/pdf', authenticateToken, pdfUpload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '未上傳檔案' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url, originalName: req.file.originalname });
});

module.exports = router;
