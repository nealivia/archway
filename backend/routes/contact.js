const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: '請填寫必填欄位' });
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'noreply@archway.tw',
      to: 'archway1991@gmail.com',
      subject: `【松上防水】新詢問：${name}`,
      html: `
        <h2>您有一封新的客戶詢問</h2>
        <hr/>
        <p><strong>姓名：</strong>${name}</p>
        <p><strong>Email：</strong>${email}</p>
        <p><strong>電話：</strong>${phone || '未填寫'}</p>
        <p><strong>詢問內容：</strong></p>
        <p style="background:#f5f5f5;padding:12px;border-radius:4px;">${message.replace(/\n/g, '<br/>')}</p>
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
