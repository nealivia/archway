// LINE Messaging API 的 webhook 接收端：唯一用途是「自動記錄要推播給誰」。
// 司機把官方帳號加為好友後，在對話裡發一則任意訊息（一對一聊天，不是群組），
// LINE 平台就會打這支 webhook，我們從事件裡的 userId 存進 settings 表，
// 之後 utils/line.js 推播訊息就會自動一對一發給司機，不需要手動去外部工具查 ID 再貼進設定檔。
// （如果之後想改回發到群組，把 Bot 加進群組、在群組裡發話也一樣會被記錄下來，會直接覆蓋成群組 ID。）
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { db } = require('../database');

router.post('/webhook', (req, res) => {
  // LINE 平台要求 webhook 一定要盡快回 200，沒收到會重送、多次失敗甚至會停用 webhook，
  // 所以先回應，事件內容非同步慢慢處理即可（不影響 LINE 那邊）。
  res.status(200).end();

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (channelSecret && req.rawBody) {
    const expected = crypto.createHmac('sha256', channelSecret).update(req.rawBody).digest('base64');
    if (expected !== req.header('X-Line-Signature')) {
      console.error('❌ LINE webhook 簽章驗證失敗，忽略這次事件（請確認 LINE_CHANNEL_SECRET 是否正確）');
      return;
    }
  }

  const events = req.body?.events || [];
  for (const event of events) {
    const source = event.source || {};
    const recipientId = source.type === 'user' ? source.userId : source.type === 'group' ? source.groupId : null;
    if (!recipientId) continue;

    try {
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('line_recipient_id', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(recipientId);
      console.log(`✅ 已記錄 LINE 收件者 ID（${source.type === 'user' ? '一對一' : '群組'}）：${recipientId}`);
    } catch (e) {
      console.error('❌ 記錄 LINE 收件者 ID 失敗:', e.message);
    }

    // 用 replyToken 回覆一次確認訊息（reply 不計入推播訊息額度，跟 push 分開算）
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (event.replyToken && token) {
      const confirmText = source.type === 'user'
        ? '✅ 松上防水電子佈告欄已連接，之後新增配送單會一對一發訊息到這裡通知你。'
        : '✅ 松上防水電子佈告欄已連接到這個群組，之後新增配送單會發訊息到這裡。';
      fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ replyToken: event.replyToken, messages: [{ type: 'text', text: confirmText }] })
      }).catch(() => { /* 回覆失敗不影響收件者 ID 已經記錄成功 */ });
    }
  }
});

module.exports = router;
