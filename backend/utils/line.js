// LINE Messaging API 群組推播：新增配送單／配送狀態變更時，自動發訊息到已連接的 LINE 群組。
// 需要在環境變數設定 LINE_CHANNEL_ACCESS_TOKEN（Messaging API 的長期存取權杖），
// 群組 ID 則是透過 routes/line-webhook.js 收到的 webhook 事件自動記錄在 settings 表，不用手動填。
// 沒有設定 token 或還沒有群組 ID 時，這裡的函式會安靜略過，不會影響配送單主要功能。
const { db } = require('../database');

function getGroupId() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'line_group_id'").get();
  return row?.value || '';
}

async function sendLineGroupMessage(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return; // 還沒設定 LINE 串接，略過
  const groupId = getGroupId();
  if (!groupId) return; // 還沒有群組 ID（Bot 還沒被拉進群組發過話），略過

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to: groupId, messages: [{ type: 'text', text }] })
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`❌ LINE 推播訊息失敗（HTTP ${res.status}）：${body}`);
    }
  } catch (e) {
    console.error('❌ LINE 推播訊息失敗:', e.message);
  }
}

module.exports = { sendLineGroupMessage, getGroupId };
