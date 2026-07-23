# Data Matters v3.6 修正報告

## 1. 留言伺服器設定相容

- Netlify Functions 會依序讀取 `SUPABASE_URL`、`VITE_SUPABASE_URL`。
- Server key 支援舊版 `SUPABASE_SERVICE_ROLE_KEY` 與新版 `SUPABASE_SECRET_KEY`。
- 新增 `community-health` Function，只回傳設定狀態，不暴露任何密鑰。
- `server_not_configured` 回應可包含缺少的設定名稱，方便 Function log 診斷。
- 新增 `docs/community-server-setup.md`。

## 2. 職涯圖鑑角色詳情

- 移除依賴 inline global lookup 的詳情按鈕。
- 角色卡與「認識這個角色」按鈕改用明確的 `addEventListener`。
- 將 `Encyclopedia`、`Modal` 與 `DataMattersRoleDetail` 明確匯出到 `window`。
- 點擊按鈕會經同一個 `openRoleDetail()` 打開既有角色詳細 Modal。

## 3. 手機探索結果角色圖置中

- 角色圖片區在 800px 以下改為 Grid `place-items:center`。
- 圖片、正方形容器與外層均移除 inherited transform、float、left／right 位移。
- 正方形圖片使用 `object-fit:contain`，維持完整角色圖。
- 腳本 cache version 更新為 v3.6.0。

## 4. 第一名角色可開啟詳細資訊

以下三處都可打開角色詳細 Modal：

- 第一名角色名稱區。
- 第一名角色圖片。
- 新增的「認識這個角色」按鈕。

支援滑鼠、觸控、Enter 與 Space 鍵。
