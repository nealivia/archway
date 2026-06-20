# ProWater 防水材料公司網站

React + Node.js + SQLite 全端網站，包含前台展示與後台管理系統。

---

## 目錄結構

```
waterproof-website/
├── backend/          # Node.js + Express 後端 API
│   ├── server.js
│   ├── database.js   # SQLite 資料庫初始化
│   ├── middleware/   # JWT 驗證
│   └── routes/       # API 路由
├── frontend/         # React + Vite + Tailwind 前端
│   └── src/
│       ├── pages/        # 前台頁面（首頁、商品、關於）
│       ├── pages/admin/  # 後台管理頁面
│       └── components/   # 共用元件
└── README.md
```

---

## 安裝與啟動

### 系統需求
- Node.js 18 以上
- npm 9 以上

---

### 1. 後端設定

```bash
cd backend
npm install
cp .env.example .env
# 編輯 .env，設定 JWT_SECRET（建議用隨機 32 字元以上字串）
npm start
```

後端預設運行於 `http://localhost:5000`

**首次啟動時會自動建立：**
- SQLite 資料庫（`backend/data.db`）
- 預設分類：防水塗料、防水捲材、填縫材料、底漆與處理劑
- 預設超級管理員帳號：`superadmin` / `Admin@1234`（**請立即修改密碼**）

---

### 2. 前端設定

```bash
cd frontend
npm install
npm run dev
```

前端預設運行於 `http://localhost:5173`

---

## 功能說明

### 前台（公開）
| 頁面 | 路徑 | 說明 |
|------|------|------|
| 首頁 | `/` | Hero banner、特色介紹、精選商品 |
| 產品目錄 | `/products` | 分類篩選、搜尋、分頁 |
| 商品詳情 | `/products/:id` | 圖片、特點、適用場景、定價 |
| 關於我們 | `/about` | 公司介紹、聯絡表單 |

### 後台（需登入）
| 頁面 | 路徑 | 權限 |
|------|------|------|
| 儀表板 | `/admin` | 全員 |
| 商品管理 | `/admin/products` | 全員 |
| 新增/編輯商品 | `/admin/products/new` | 全員 |
| 分類管理 | `/admin/categories` | 全員 |
| 帳號管理 | `/admin/users` | **僅超級管理員** |

---

## 角色權限

| 功能 | 一般管理員 | 超級管理員 |
|------|-----------|-----------|
| 上架/下架商品 | ✅ | ✅ |
| 修改定價 | ✅ | ✅ |
| 新增/刪除商品 | ✅ | ✅ |
| 管理分類 | ✅ | ✅ |
| 管理帳號 | ❌ | ✅ |
| 停用帳號 | ❌ | ✅ |

---

## 正式部署建議

### 後端
1. 修改 `.env` 中的 `JWT_SECRET` 為安全隨機字串
2. 設定 `FRONTEND_URL` 為正式網域
3. 使用 PM2 管理 Node 程序：`pm2 start server.js --name prowater-backend`
4. 定期備份 `data.db` 檔案

### 前端
```bash
cd frontend
npm run build
# 將 dist/ 資料夾部署至 Nginx / Apache 或 Vercel / Netlify
```

### Nginx 範例設定（前後端同主機）
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # 前台靜態檔案
    root /var/www/prowater/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 後端 API 代理
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 圖片上傳
    location /uploads/ {
        proxy_pass http://localhost:5000;
    }
}
```

---

## 安全注意事項

- ✅ 密碼使用 bcrypt 雜湊儲存
- ✅ JWT Token 有效期 8 小時
- ✅ 角色權限在後端 API 層驗證
- ✅ 圖片上傳限制檔案類型與大小（10MB）
- ⚠️ **首次部署後請立即修改預設管理員密碼**
- ⚠️ 正式環境請設定 HTTPS
