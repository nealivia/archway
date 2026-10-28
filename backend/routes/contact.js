const express = require('express');
const router = express.Router();

// 防止訪客輸入的內容被當成 HTML 塞進通知信（避免假連結/釣魚）
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// 聯絡表單專用限流：每 IP 每小時最多 5 封
const hits = new Map();
function contactLimiter(req, res, next) {
  const now = Date.now(), win = 60 * 60 * 1000;
  const e = hits.get(req.ip);
  if (!e || now > e.reset) { hits.set(req.ip, { count: 1, reset: now + win }); return next(); }
  if (++e.count > 5) return res.status(429).json({ success: false, message: '送出次數過多，請稍後再試或直接來電' });
  next();
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (n > v.reset) hits.delete(k); }, 10 * 60 * 1000).unref();

router.post('/', contactLimiter, async (req, res) => {
  const { name, email, phone, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: '請填寫必填欄位' });
  }
  if ([name, email, phone, message].some(v => v != null && typeof v !== 'string') ||
      name.length > 50 || email.length > 100 || (phone || '').length > 30 || message.length > 2000 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: '欄位內容格式或長度不正確' });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'noreply@archway.tw',
      to: 'archway1991@gmail.com',
      subject: `【松上防水】新詢問：${String(name).replace(/[\r\n]/g, ' ')}`,
      html: `
        <h2>您有一封新的客戶詢問</h2>
        <hr/>
        <p><strong>姓名：</strong>${esc(name)}</p>
        <p><strong>Email：</strong>${esc(email)}</p>
        <p><strong>電話：</strong>${esc(phone) || '未填寫'}</p>
        <p><strong>詢問內容：</strong></p>
        <p style="background:#f5f5f5;padding:12px;border-radius:4px;">${esc(message).replace(/\n/g, '<br/>')}</p>
        <hr/>
        <p style="color:#999;font-size:12px;">此信件由 松上防水官網 自動發送</p>
      `
    });

    res.json({ success: true, message: '詢問已送出，我們將盡快回覆您！' });
  } catch (err) {
    console.error('寄信失敗:', err);
    res.status(500).json({ success: false, message: '送出失敗，請直接來電或 LINE 聯繫我們' });
  }
});

module.exports = router;
