# 留言板安全設計

## 權限模型

- 所有 base table 啟用 RLS。
- anon/authenticated 不直接讀寫 base table。
- Netlify Function 使用 server-only service role，且只從欄位受限的 visible views 回傳公開內容。
- 寫入只經 Netlify Function 或等價的 Supabase Edge Function。
- 管理操作只使用 Supabase Dashboard、SQL Editor 或受保護後台。

## 不儲存明文 IP

Netlify Function 讀取平台提供的 IP 後，使用 `COMMUNITY_HASH_SALT` 做 SHA-256 雜湊，只將 hash 寫入資料庫。User-Agent 與 session 亦採同樣方式。Hash 只用於限流與防濫用，不做跨站追蹤。

## 來源限制

Function 只接受 `COMMUNITY_ALLOWED_ORIGINS` 內的瀏覽器 Origin；本機開發需明確加入 localhost。

## 前後端驗證

前端提供即時提示，但後端驗證才是權威：

- Honeypot。
- 最短填寫時間。
- trim 與長度限制。
- 純文字，不允許 HTML 或 Markdown link。
- Email、電話、網址與常見個資格式攔截。
- 連結數、重複字元、垃圾內容與重複送出檢查。
- 同 session／fingerprint 限流。

驗證規則集中於 `_community-utils.js`，不散落在 UI component。

## Rate Limit

留言：每分鐘 1 篇、10 分鐘 3 篇、每日 10 篇。

回覆：每分鐘 2 則、10 分鐘 8 則、每日 20 則。

目前使用資料庫查詢計數，流量大時應改為原子化 RPC 或外部 rate-limit store，避免競態條件。

## Cloudflare Turnstile

設定 `TURNSTILE_SECRET_KEY` 後，Function 會驗證前端傳入 token。第一版可只在異常流量時開啟，但正式啟用時前端也需加入 site key 與 token 取得流程。

## Analytics

只傳 category、user_type、content_length_bucket、reply_count_bucket、source_page、environment、app_version。禁止傳留言、回覆、暱稱、Email、電話、IP 或 fingerprint。

## 錯誤訊息

前端只顯示可理解的通用錯誤；Supabase 原始錯誤只可出現在 server log，不回傳給使用者。
