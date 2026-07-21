# 部署清單

## 1. 必須做｜Supabase

1. 在 staging 專案先執行 `supabase/migrations/002_community_board.sql`；若留言板已存在，再執行 `004_simplify_community_category.sql`。
2. 檢查三張 table、兩個 public view、trigger 與 index。
3. 確認 base tables 的 RLS 為 enabled。
4. 用 anon key 驗證：
   - 不能直接 select／insert／update／delete base tables。
   - 不能直接讀取兩個 public views；瀏覽器只可透過 Netlify Function 取得公開資料。
5. 以 staging Function 驗證只回傳 visible posts／replies，且看不到 `session_id`、hash、status、moderation_reason。
6. 在 production 重複執行 migration。

Rollback：先停用留言板入口與 Functions，再執行 `002_community_board_rollback.sql`。Rollback 會刪除留言板資料，執行前先備份。

## 2. 必須做｜Netlify Environment Variables

Public build（選配）：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANALYTICS_ENABLED=true
VITE_ANALYTICS_ENV=production
VITE_ANALYTICS_DEBUG=false
```

若不設定這些變數，build 會保留 repository 現有的 `analytics-config.js`，因此不會把目前 Supabase URL／anon key 清空。不要用空白模板覆蓋現有設定。

Functions only：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY（或 SUPABASE_SECRET_KEY，二擇一）
COMMUNITY_HASH_SALT=<至少 32 字元隨機字串>
COMMUNITY_ALLOWED_ORIGINS=https://datamatters-hanks-career-board.netlify.app
```

不要把 service role key 放到 `VITE_` 變數、repository 或前端 config。

## 3. 必須做｜Netlify Build

```text
Build command: npm run build
Publish directory: dist
Functions directory: netlify/functions
Node version: 24
```

`netlify.toml` 已包含相同設定。部署後確認 `/.netlify/functions/community-read` 回傳 JSON，而不是 HTML 404。

## 4. 必須做｜部署順序

1. 建立 Supabase 備份或確認 PITR／備份政策。
2. staging migration。
3. staging environment variables。
4. staging deploy。
5. 測驗、結果、職缺、分享、留言、回覆與檢舉 smoke test。
6. production migration。
7. production environment variables。
8. production deploy。
9. 監控 Functions error、429、community failure 與原 Analytics funnel。

## 5. 選配｜Cloudflare Turnstile

後端已支援 `TURNSTILE_SECRET_KEY` 與 `COMMUNITY_REQUIRE_TURNSTILE`。目前前端未放固定 challenge widget；先保持 `COMMUNITY_REQUIRE_TURNSTILE=false`。要強制驗證前，必須完成前端 site key、token 與錯誤流程。

## 6. 已自動完成

- 前端只呼叫 Netlify Functions；read Function 從 public views 回傳公開欄位。
- 寫入、回覆與檢舉經 Netlify Functions。
- IP／User-Agent／session 伺服器端雜湊。
- 公開 Analytics payload 清理。
- 1080 × 1920 Canvas 分享圖與 referral URL。
- hash routing 使用既有單頁架構，不需要新增多頁 redirect。

## 7. 上線後 Smoke Test

- 390px 無水平溢出，按鈕可點區至少 44px。
- 三站測驗可完成，重測可重新開始。
- 第一推薦、其他方向與職缺正常。
- Accordion 鍵盤操作與 `aria-expanded` 正確。
- Compare modal focus trap、Escape 與焦點返回。
- 分享圖中文字與九角色圖片正常，角色圖完整且未被裁切。
- iPhone Safari／Android Chrome 的下載與 native share fallback。
- 留言、回覆、重複內容、速率限制、個資攔截與檢舉。
- 使用者看不到 Supabase 原始錯誤。

## 8. Rollback

前端：在 Netlify 將 production deploy 回復到上一版。

Functions：上一版前端不會呼叫新 endpoints，可保留；若需停用，移除 Functions 或回復 deploy。

資料庫：不要因前端 rollback 立刻 drop table。先保留資料，確認不再需要後才執行 rollback migration。


## 9. 必須做｜上線後第一週監控

- 每日檢查 Quiz Start、Completion、Result View 與 Job CTR 是否明顯下降。
- 比較 Clarity Before／After，確認平均 lift 並查看缺失率。
- 檢查 `quiz_question_answered` 的選項偏斜、作答時間與修改率。
- 檢查分享圖生成失敗率、下載率與 shared-result referral completion。
- 檢查 Community Functions 的 4xx／5xx／429、重複內容與檢舉量。
- 每日至少一次人工查看 open reports；個資外洩內容優先隱藏。
- 確認 Analytics 中沒有留言內容、暱稱、Email、電話或完整答案。


## v3.6 留言伺服器健康檢查

部署後開啟：

```text
/.netlify/functions/community-health
```

正常應回傳 `{"ok":true,"database":true}`。若回傳 `server_not_configured`，確認 Netlify Production context 至少有：

- `SUPABASE_URL`；Function 也可相容讀取既有 `VITE_SUPABASE_URL`。
- `SUPABASE_SERVICE_ROLE_KEY` 或新版 `SUPABASE_SECRET_KEY`，二擇一。
- `COMMUNITY_HASH_SALT`；若未設定，會安全地以 server secret 作為 salt，但仍建議獨立設定至少 32 字元亂數。

設定環境變數後必須觸發一次新的 Production deploy；只儲存變數不會更新已部署的 Function runtime。
