# Data Matters v3.2 驗證結果

## 已實際執行

- `npm run lint`：通過；8 個 JavaScript 檔案語法正確，48 個 HTML ID 無重複。
- `npm run test:product`：16／16 通過。
- Community runtime fallback：通過；模擬公開 View 回傳 PostgreSQL `42P01`，成功改讀 visible base-table fields。
- `npm run build:overlay`：通過。
- 使用含真實 `data/`、`images/` 與 analytics config 的整合 fixture 執行 `npm run build`：通過。

## 本次修正涵蓋

- Carousel 中心角色判定、連續下一張、pointer drag、active 狀態。
- 工作重心 X／Y 軸結構與免責文字位置。
- Community View fallback、錯誤分類與 service-role migration。

## 尚未聲稱通過

- 此執行環境無法讓 Chromium 存取 localhost 或 file URL，因此未完成實際瀏覽器自動點擊／滑動測試。
- 使用者 repository 內的 `validate-data.mjs`、`test-cases.mjs`、`test-analytics.mjs` 不在本更新包中；套用後仍須在完整 repository 執行 `npm run validate`。
- 真實 Supabase 與 Netlify 環境需執行 `005_repair_community_read.sql` 並重新部署後再做 E2E 驗證。
