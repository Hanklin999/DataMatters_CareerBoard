# Data Matters v3 驗證報告

執行日期：2026-07-21

## 已實際執行並通過

- `npm run lint`
  - 8 個自有 JavaScript 檔案 syntax 通過。
  - 47 個 HTML ID，無重複。
- 現有 Analytics contract 相容測試：19／19 通過。
  - 含 `env`、`enabled`、`sessionId()`、array POST body、UTM、referrer、allowlist、once guards、local disable。
- `npm run test:product`：10／10 通過。
- Netlify Functions `node --check`：通過。
- QR generator smoke test：通過，正式 referral URL 產生 53×53 modules。
- PostgreSQL migration parser：
  - `002_community_board.sql` 通過。
  - `002_community_board_rollback.sql` 通過。
- `npm run build`：在暫時的整合 fixture（9 family／jobs／data folder）下通過。

## 套回目前 repository 後由 CI 執行

更新後 workflow 會在真正的 `data/careers.json`、`data/skills.json`、`images/` 上執行：

- `node validate-data.mjs`
- `node test-analytics.mjs`
- `node test-cases.mjs`
- `node --test tests/*.test.mjs`
- `npm run build`

本工作環境沒有取得 repository 的完整 JSON／圖片二進位資產，因此沒有聲稱上述三個原始腳本已在真實資料上通過。

## 未實際完成

- Supabase staging／production migration execution。
- 真實 Netlify Functions＋Supabase E2E。
- 390px 與 desktop 的瀏覽器視覺截圖檢查。
- Modal／Accordion 的真實瀏覽器鍵盤操作。
- iPhone Safari、Android Chrome、Desktop Chrome 實機測試。
- 九張角色圖的 1080×1920 真實 Canvas 輸出。
- 手機相機 QR 掃描。
- 留言／回覆／檢舉／rate-limit 的真實資料庫測試。

## 未通過項目

沒有已執行但失敗且未修復的靜態／單元測試。瀏覽器 E2E 在此執行環境被瀏覽器管理政策阻擋，因此列為「未執行」，不是通過。
