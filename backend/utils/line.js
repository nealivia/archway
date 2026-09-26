// LINE Messaging API 推播：新增配送單時，自動發一對一訊息通知司機。
// 推播是「發給幾個人就算幾則」計費，一對一（推給司機一個人）比發到群組（算群組人數）省很多用量。
// 需要在環境變數設定 LINE_CHANNEL_ACCESS_TOKEN（Messaging API 的長期存取權杖），
// 收件者 ID（司機的 user ID，或群組 ID）則是透過 routes/line-webhook.js 收到的 webhook 事件
// 自動記錄在 settings 表（key: line_recipient_id），不用手動去查。
// 沒有設定 token 或還沒有收件者 ID 時，這裡的函式會安靜略過，不會影響配送單主要功能。
const { db } = require('../database');

function getRecipientId() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'line_recipient_id'").get();
  return row?.value || '';
}

async function sendLineMessage(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return; // 還沒設定 LINE 串接，略過
  const recipientId = getRecipientId();
  if (!recipientId) return; // 司機還沒加好友發過話，還抓不到收件者 ID，略過

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to: recipientId, messages: [{ type: 'text', text }] })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`❌ LINE 推播訊息失敗（HTTP ${res.status}）：${body}`);
    }
  } catch (e) {
    console.error('❌ LINE 推播訊息失敗:', e.message);
  }
}

module.exports = { sendLineMessage, getRecipientId };
