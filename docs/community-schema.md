# 留言板資料結構

Migration：`supabase/migrations/002_community_board.sql`

## Tables

### community_posts

儲存暱稱、選填身分、分類、純文字內容、狀態、回覆數、匿名 session 與雜湊後的防濫用訊號。

### community_replies

一層回覆，透過 `post_id` 連到留言。刪除留言時 cascade；一般管理操作只改 `status`，不實體刪除。

### community_reports

儲存檢舉目標、原因、選填說明、匿名 session、狀態與 fingerprint hash，用於避免同一來源重複檢舉。

## Public Views

- `public_visible_community_posts`
- `public_visible_community_replies`

View 只回傳公開欄位，且只包含 `visible` 狀態。瀏覽器不直接存取 base table 或 View；讀取與寫入都經 Netlify Functions，匿名角色沒有 select、insert、update 或 delete 權限。

## reply_count

資料庫 trigger 在 reply insert、update 或 delete 後重新計算可見回覆數。前端與匿名使用者不能直接修改。

## Status

- `visible`：公開顯示。
- `pending`：等待人工檢查。
- `hidden`：保留資料但不公開。
- `deleted`：邏輯刪除。

## 寫入路徑

前端只呼叫 Netlify Functions。Function 使用 server-side service role key 完成驗證、限流與 insert。不要將 service role key 放進瀏覽器環境變數。
