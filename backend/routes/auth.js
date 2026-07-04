const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { db } = require('../database');
const { authenticateToken, generateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

// 產生短效臨時 token（僅用於 2FA 第二步驟）
function generateTempToken(userId) {
  return jwt.sign({ id: userId, scope: '2fa_verify' }, JWT_SECRET, { expiresIn: '5m' });
}

// ─── 登入 ───────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: '請填寫帳號與密碼' });

  const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ success: false, message: '帳號或密碼錯誤' });

  // 若啟用 2FA，返回臨時 token，前端進行第二步驟
  if (user.totp_enabled) {
    const tempToken = generateTempToken(user.id);
    return res.json({ success: true, requires2FA: true, tempToken });
  }

  // 無 2FA，直接登入
  const token = generateToken(user);
  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    user.id, 'LOGIN', `使用者 ${user.username} 登入`
  );
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role }
  });
});

// ─── 2FA 第二步驟：驗證 TOTP 碼 ────────────────────────────────────────────
router.post('/2fa/verify-login', (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code)
    return res.status(400).json({ success: false, message: '缺少必要參數' });

  let decoded;
  try {
    decoded = jwt.verify(tempToken, JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: '驗證已過期，請重新登入' });
  }

  if (decoded.scope !== '2fa_verify')
    return res.status(401).json({ success: false, message: 'Token 無效' });

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(decoded.id);
  if (!user || !user.totp_enabled || !user.totp_secret)
    return res.status(401).json({ success: false, message: '帳號狀態異常' });

  const valid = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: String(code).replace(/\s/g, ''),
    window: 1
  });

  if (!valid)
    return res.status(401).json({ success: false, message: '驗證碼錯誤，請重試' });

  const token = generateToken(user);
  db.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)').run(
    user.id, 'LOGIN', `使用者 ${user.username} 登入（2FA）`
  );
  res.json({
    success: true,
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role }
  });
});

// ─── 2FA 設定：產生 QR code ─────────────────────────────────────────────────
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const secret = speakeasy.generateSecret({
    name: `松上防水後台 (${user.username})`,
    issuer: 'Archway'
  });

  // 暫存 secret（尚未 enable，待 confirm 後才寫入）
  db.prepare("UPDATE users SET totp_secret = ? WHERE id = ?").run(secret.base32, user.id);

  const otpauthUrl = secret.otpauth_url;
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  res.json({
    success: true,
    qrCode: qrDataUrl,
    secret: secret.base32  // 備用手動輸入
  });
});

// ─── 2FA 設定：確認驗證碼並啟用 ────────────────────────────────────────────
router.post('/2fa/confirm-setup', authenticateToken, (req, res) => {
  const { code } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user.totp_secret)
    return res.status(400).json({ success: false, message: '請先進行設定步驟' });

  const valid = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: String(code).replace(/\s/g, ''),
    window: 1
  });

  if (!valid)
    return res.status(400).json({ success: false, message: '驗證碼錯誤，請確認驗證器時間正確' });

  db.prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?").run(user.id);
  res.json({ success: true, message: '雙因素驗證已啟用' });
});

// ─── 2FA 停用 ───────────────────────────────────────────────────────────────
router.post('/2fa/disable', authenticateToken, (req, res) => {
  const { code } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!user.totp_enabled)
    return res.status(400).json({ success: false, message: '尚未啟用雙因素驗證' });

  const valid = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token: String(code).replace(/\s/g, ''),
    window: 1
  });

  if (!valid)
    return res.status(400).json({ success: false, message: '驗證碼錯誤' });

  db.prepare("UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = ?").run(user.id);
  res.json({ success: true, message: '雙因素驗證已停用' });
});

// ─── 取得當前使用者資訊 ──────────────────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, totp_enabled FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user });
});

// ─── 修改密碼 ────────────────────────────────────────────────────────────────
router.put('/change-password', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ success: false, message: '請填寫完整' });
  if (newPassword.length < 8)
    return res.status(400).json({ success: false, message: '新密碼至少需要 8 個字元' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(oldPassword, user.password_hash))
    return res.status(400).json({ success: false, message: '舊密碼錯誤' });

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, req.user.id);
  res.json({ success: true, message: '密碼修改成功' });
});

module.exports = router;
