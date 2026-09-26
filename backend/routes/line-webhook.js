// LINE Messaging API 的 webhook 接收端：唯一用途是「自動記錄 Bot 被拉進哪個群組」。
// 把官方帳號的 Bot 加進目標 LINE 群組後，在群組裡發一則任意訊息，LINE 平台就會打這支 webhook，
// 我們從事件裡的 groupId 存進 settings 表，之後 utils/line.js 推播訊息就會自動送到這個群組，
// 不需要手動去外部工具查 group id 再貼進設定檔。
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
    if (event.source?.type !== 'group' || !event.source.groupId) continue;
    const groupId = event.source.groupId;
    try {
      db.prepare(`
        INSERT INTO settings (key, value) VALUES ('line_group_id', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
      `).run(groupId);
      console.log(`✅ 已記錄 LINE 群組 ID：${groupId}（之後配送單通知會發到這個群組）`);
    } catch (e) {
      console.error('❌ 記錄 LINE 群組 ID 失敗:', e.message);
    }

    // 用 replyToken 回覆一次確認訊息（reply 不計入推播訊息額度，跟 push 分開算）
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (event.replyToken && token) {
      fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: '✅ 松上防水電子佈告欄已連接到這個群組，之後新增配送單／配送狀態變更會發訊息到這裡。' }]
        })
      }).catch(() => { /* 回覆失敗不影響群組 ID 已經記錄成功 */ });
    }
  }
});

module.exports = router;
