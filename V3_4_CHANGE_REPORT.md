# Data Matters v3.4 Hotfix 修改報告

## 1. 留言發布

### 問題
正式資料庫可能仍只接受舊分類值，但 v3.1–v3.3 的前端已移除分類問題，Function 卻寫入新值「一般討論」，導致 PostgreSQL check constraint 拒絕 insert，前端只顯示「目前無法發布」。

### 修改
- `netlify/functions/community-submit.js`
  - 不再要求使用者選分類。
  - 預設寫入既有資料庫可接受的內部分類「職涯方向」。
  - 可用 `COMMUNITY_DEFAULT_CATEGORY` 覆寫，但一般部署不需要設定。
  - 將 relation、permission、schema constraint 與 server config 錯誤轉成明確錯誤代碼。
- `community.js`
  - 分別顯示資料表未建立、權限未完成、資料庫版本過舊、發布過快、重複內容與個資攔截訊息。
  - 不再把所有錯誤都吞成同一句。

### 相容性
- 不需要新增留言分類 UI。
- 不需要為這次 hotfix 修改既有留言資料。
- 已經執行過 Community migration 的專案可直接重新部署。

## 2. 職涯圖鑑滑動

### 問題
舊實作使用 native horizontal scroll，再從 scroll position 推算 active card。圖鑑頁面在隱藏狀態初始化時寬度為 0，第一次按箭頭常只完成尺寸校正；scroll event 也可能把 active index 改回上一張。

### 修改
- 改為固定 `activeIndex` 與 `.ency-track` transform。
- 按一次箭頭：
  1. active index 立即加減 1。
  2. 新卡立即套用 `is-active` 放大。
  3. track 在同一操作中平滑移到正中央。
- 不再依賴 scroll event 判斷目前角色。
- 圖鑑頁顯示後才重新量測尺寸。
- 支援：
  - 左右箭頭
  - 鍵盤方向鍵
  - 手機水平拖曳
  - 桌面 pointer drag
  - 觸控放開後吸附
  - 點擊非 active card 時先將該卡置中

## 3. 手機探索結果角色圖

### 問題
結果頁在 hidden view 內先建立，角色圖片使用 lazy loading；部分手機瀏覽器在 view 顯示後未穩定觸發圖片載入。

### 修改
- Hero 圖改為 `loading="eager"`。
- 加入 `fetchpriority="high"` 與 `decoding="async"`。
- 結果頁顯示後再次確認 Hero 圖片可見。
- 手機版保留固定正方形顯示空間。
- 以 `display/visibility/opacity` 保證容器與圖片不被舊 CSS 隱藏。
- 圖片仍使用 `object-fit: contain`，不裁切；讀取失敗則顯示既有角色 fallback。

## 4. Analytics URL validation

### 問題
CI 顯示以下 4 個錯誤 URL 未被拒絕：
- Supabase Dashboard URL
- 已包含 `/rest/v1` 的 URL
- HTTP URL
- 偽造的非 `supabase.co` 網域

### 修改
`analytics.js` 現在只接受：

```text
https://<project-ref>.supabase.co
```

並拒絕：
- 非 HTTPS
- 非精確 `.supabase.co` project host
- 任意 path
- query string
- hash
- username、password 或 port

## 5. 其他同步修正

- 工作重心 HTML 改成與新版 Grid CSS 一致的結構。
- `window.DATA_MATTERS_APP_VERSION` 更新為 `v3.4`。
- `package.json` 更新為 `3.4.0`。
- build 產生的 Analytics config 版本更新為 `v3.4`。
