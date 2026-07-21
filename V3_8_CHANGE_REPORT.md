# Data Matters v3.8 Change Report

## 1. 手機測驗結果角色圖

- 新增最後一層 `#result-hero` 手機專屬規則。
- 結果 Hero 固定為「標題 → 圖片 → 內容」。
- 圖片按鈕與正方形角色圖都使用明確寬度、`margin: auto`、`object-position: center`。
- 清除 inherited `inset`、`translate`、`transform`、`float`，避免圖片偏到畫面一側。

## 2. 複製分享連結

- 複製連結改為 `/share/[role-id]`。
- 新增 Netlify Function：`netlify/functions/role-share.js`。
- 分享頁為每個角色輸出不同的 Open Graph / Twitter meta。
- 預覽圖改用對應角色圖片，不再使用網站通用預覽圖。
- 使用者點分享連結後會自動回到 Data Matters，保留分享 UTM。
- 下載按鈕仍產生 1080 × 1920 PNG。

## 3. 職涯圖鑑整張卡片可點擊

- 桌面 `click` 保留。
- 手機新增 pointer tap 處理：手指放開時，只要不是拖曳，就立即置中並打開角色詳情。
- 拖曳與點擊分開判斷，避免手機瀏覽器吃掉 click。
- 卡片內一般內容不攔截點擊；「認識這個角色」按鈕仍可正常使用。

## 4. 留言板 Supabase URL

- 不再單純採用第一個非空環境變數。
- `SUPABASE_URL` 與 `VITE_SUPABASE_URL` 會逐一驗證，使用第一個合法 Project URL。
- 錯誤的 `SUPABASE_URL` 不會再蓋掉正確的 `VITE_SUPABASE_URL`。
- Health endpoint 新增 `url_host` 與 `invalid_url_sources`，方便確認到底哪個變數錯誤。
- 新增逐步部署文件：`docs/community-deploy-step-by-step.md`。

## 5. 關於 Data Matters

新增：

- Hank 一句話介紹
- Threads 與 Email
- 感謝 JC 提供金融版本構想
- JC Threads
- 金融職涯｜GC交易所網站
