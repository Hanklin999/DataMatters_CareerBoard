# Data Matters v3.6 驗證報告

## 已實際執行

- `npm run lint`：通過；8 個 JavaScript 檔案、48 個唯一 HTML ID。
- `npm run test:product`：28／28 通過。
- `npm run build:overlay`：通過。
- JavaScript syntax check：`app.js`、`product-v3.js`、`community.js`、所有 Community Functions 通過。

## 新增 regression tests

- `VITE_SUPABASE_URL` + `SUPABASE_SECRET_KEY` server config fallback。
- 職涯圖鑑角色詳情確實打開共用 Modal。
- 第一名角色詳情入口存在於名稱、圖片與按鈕。
- 手機角色圖最後一層置中規則。

## 未聲稱通過

此更新包不含正式 repository 的 `data/`、`images/`、`analytics-config.js`、`validate-data.mjs`、`test-cases.mjs` 與 `test-analytics.mjs`，因此必須套回完整 repository 後再執行 `npm run validate`。

Netlify 的 Production 環境變數無法由更新包代替設定；部署後必須用 `/.netlify/functions/community-health` 驗證。
