# Data Matters v3 修改結果

## 目前 GitHub 上的版本

GitHub `master` 目前沒有 release tag；依 repository 內容判定為 **v2 核心版**：18 題、Preference／Background／Environment 三分數系統、九角色、基本結果與 Supabase Analytics。角色比較、Story 分享、留言板、新版結果資訊架構與 v3 文件尚未在目前 `master` 中。

本更新包目標版本：**v3.0.0**。

## 重要相容性原則

- 保留九個 Job Family、既有 family key、角色資料與職缺 JSON。
- 保留既有 `analytics-config.js` 與 Supabase project 設定。
- 保留 `DMAnalytics.env`、`enabled`、`sessionId()`、array POST body 等既有測試 contract。
- 不包含或覆蓋 `data/`、`images/`、`.git/`、既有 `test-analytics.mjs`、`test-cases.mjs`、`validate-data.mjs`。
- 不提交 service role key，也不把留言內容、暱稱或完整答案傳入 Analytics。

# 1. 完整修改結果

## 根目錄

### `index.html`

- 首頁只保留用途、三項結果預告、主要／次要 CTA 與低權重留言板入口。
- 隱私文案改為：測驗不需要姓名或 Email；網站匿名記錄基本操作。
- 結果頁 DOM 順序調整為：Hero → 為什麼像你 → 可能做的工作 → 其他方向 → 完整輪廓 → 真實職缺 → 回饋。
- 加入留言板 view、Toast、可存取 Modal 與分享入口。
- QR Code 改用本地 `vendor/qrcode.js`，不依賴外部 CDN。
- 設定前端 app version 為 `v3`，不覆寫既有 Supabase config。

### `styles.css`

- 沿用既有設計系統，保留角色配色、卡片、按鈕與原頁面樣式。
- 修正新版區塊所需的基礎間距與相容樣式，不重建第二套主題。

### `product-v3.css`

- 新增結果 Hero、三張理由卡、常見工作卡、次要角色卡、Accordion、工作重心地圖、角色比較、分享預覽與留言板樣式。
- 390px 手機規則、`overflow-x: hidden`、44px 觸控區與 `:focus-visible`。
- 手機版角色圖片高度受限，不讓圖片吃掉完整首屏。
- Modal、Bottom-sheet 式手機呈現、錯誤／Loading 狀態與鍵盤焦點樣式。

### `app.js`

- 保留目前 v2 三分數演算法、九角色 mapping、adjacency 與 confidence 邏輯。
- 修正檔頭隱私敘述，不再宣稱完全不上傳資料。
- 題數維持 18，不新增角色或題目層級。
- 改寫 12 個 Preference 題，使題目更直接、生活化：
  - `coding_effort`
  - `algorithm_effort`
  - `problem_type`
  - `system_type`
  - `math_pref`
  - `work_result`
  - `output_pref`
  - `responsibility`
  - `stakeholder_freq`
  - `deep_focus`
  - `ambiguity`
  - `stable_delivery`
- 精簡 5 個 Environment 題的題目與標籤：
  - `income`
  - `prestige`
  - `security`
  - `worklife`
  - `intensity`
- 舊 ID `work_style`、`customer_vs_analysis`、`problem_solving`、`research_vs_execution` 已不存在於目前 v2，因此沒有建立重複題目。
- Environment 題仍只進 `environmentScores`；科系仍只進 `backgroundScores`。
- `lowIsMeaningful:false` 的低分不會自動替其他角色加分；只有 `ambiguity` 等真正雙向題可使用低側訊號。
- 路線維持：主角色、adjacency 鄰近角色、考慮 background gap 的延伸角色。

### `product-v3.js`

- 在既有 `Nav`、`Stations`、`Results`、`Encyclopedia`、`Modal` 上擴充，不建立第二套路由與資料 store。
- 題目層級 Analytics：作答時間、改答、前一選項、mapping version。
- Hero 第一屏顯示 RPG 名稱、真實職能、一句描述、三個偏好原因與兩個 CTA。
- 推薦理由只取 Preference 題貢獻，不把科系、收入、品牌或高壓當理由。
- 直接顯示第一角色三個常見職稱與最多六筆職缺。
- 完整輪廓改為預設收合 Accordion，支援 `aria-expanded`。
- 角色比較最多兩個角色，桌面雙欄、手機上下排列；比較工作、產出、技術、合作對象、職稱、成就感與常見混淆。
- 工作重心地圖座標：
  - Strategy `(22,18)`
  - Finance `(18,38)`
  - Governance `(55,18)`
  - Product `(76,28)`
  - Operations Research `(43,48)`
  - Data Engineering `(76,52)`
  - Data Analytics／BI `(22,72)`
  - Data Science `(45,70)`
  - ML／AI Engineering `(80,78)`
- Story 分享：Canvas 1080×1920、本地角色圖片、三個偏好標籤、QR、referral URL、Web Share Level 2 與下載／複製連結 fallback。
- 分享檔名為 `data-matters-[role-id]-story.png`。
- Modal focus trap、Escape 關閉與焦點返回。

### `analytics.js`

- 修復前一版造成 GitHub Actions 失敗的 API contract：
  - `DMAnalytics.env`
  - `DMAnalytics.enabled`
  - `DMAnalytics.sessionId()`
  - PostgREST body 維持 array
  - `occurred_at` 交給 DB default
  - 事件與 properties allowlist
- 保留 `trackOncePerSession`、`trackOncePerRun`、`resetRunGuards`。
- 擴充 result、compare、share、community 事件。
- Denylist 阻擋 content、nickname、Email、phone、address、IP、fingerprint 與完整答案欄位。

### `community.js`

- 匿名留言板 UI：分類、最新／最多回覆、發文、一層回覆、展開全文、檢舉。
- 前端驗證暱稱、字數、HTML／Markdown、Email、電話、網址、身分證與地址格式。
- Honeypot、最短填寫時間、防重複送出與通用錯誤訊息。
- 不把暱稱或內容放入 Analytics。
- 使用 Netlify Functions，不直接以 anon key 寫入資料表。

### `vendor/qrcode.js`

- qrcode-generator 1.4.4（MIT）的本地版本。
- 避免 jsDelivr／cdnjs、CSP 或網路阻擋讓分享圖失敗。

### `package.json`

- 版本 `3.0.0`，Node >=22。
- 加入 lint、資料驗證、既有 Analytics／matching 測試、新 v3 測試與 production build 指令。
- `npm run validate` 會依序跑完整驗收。

### `netlify.toml`

- Build：`npm run build`。
- Publish：`dist`。
- Functions：`netlify/functions`。
- Node 24、安全 headers 與 Functions no-store。

### `.env.example`

- 列出 public analytics build variables。
- 列出 Functions-only service role、hash salt、allowed origins 與選配 Turnstile。
- 不包含任何真正 key。

### `README.md`

- 重寫為 Product Case Study：Problem、User、Hypothesis、Solution、IA、Matching Logic、Analytics、Iterations、Metrics、Limitations、Tech Stack、Local Development、Environment Variables、Deployment、Roadmap。

### `DEPLOYMENT.md`

- Supabase migration、RLS、Functions、Netlify variables、部署順序、Smoke test、rollback 與上線第一週監控。

## 建置與 CI

### `.github/workflows/validate.yml`

- 升級 `actions/checkout@v6`、`actions/setup-node@v6` 與 Node 24。
- 執行原資料驗證、原 Analytics／matching tests、新 v3 tests 與 build。
- 解決 Node 20 deprecated warning。

### `scripts/build.mjs`

- 產生 `dist/` 並複製既有 data、images、docs 與 vendor。
- 預設保留 repository 現有 `analytics-config.js`。
- 只有同時提供 public Supabase URL／anon key 時，才生成 dist-only config。
- 絕不寫入 service role key。

### `scripts/static-lint.mjs`

- JavaScript syntax、重複 HTML ID、viewport、skip link、Modal aria 與 service-role credential 檢查。
- 允許 Supabase anon key；anon key 是前端 public credential，不誤判為 service role。

### `scripts/serve.mjs`

- 零依賴本機靜態 server。

### `tests/product-v3.test.mjs`

- 10 項測試：題數／分數系統、環境題隔離、結果順序、Story 尺寸／safe area／本地 QR、九座標、留言板資料外洩、RLS、390px、事件字典與個資／垃圾訊息攔截。

## Netlify Functions

### `_community-utils.js`

- Server-side validation、Origin allowlist、SHA-256 salted hash、Supabase service-role REST helper、Turnstile 驗證與 rate-limit 查詢。
- 攔截 Email、電話、身分證、網址、地址、詐騙、招募垃圾、仇恨／攻擊與重複字元。

### `community-read.js`

- 只從 visible views 讀取公開欄位。
- 支援分類、最新／最多回覆與一層 replies。

### `community-submit.js`

- 留言／回覆共用寫入入口。
- Honeypot、最短時間、同 fingerprint 限流、重複內容、Turnstile 選配與 server-side validation。

### `community-report.js`

- 建立檢舉並以 fingerprint／session 防止重複檢舉。

## Supabase

### `002_community_board.sql`

- 三張 table、constraints、indexes、updated trigger、reply-count trigger。
- 三張 base table 啟用 RLS。
- anon／authenticated 無 base table 或 view 直接權限。
- 兩個 visible views 只包含公開欄位；由 server-only Function 使用。
- fingerprint 與 session 的重複檢舉 unique indexes。

### `002_community_board_rollback.sql`

- 回復 community schema；會刪除留言資料，僅在確認備份後使用。

## 文件

- `docs/methodology.md`：三分數、路線、confidence、taxonomy、Analytics 與驗證計畫。
- `docs/question-diagnostics.md`：時間、改答、退出、偏斜、資訊量與 SQL。
- `docs/result-sharing.md`：Canvas、safe area、本地 QR、Web Share、fallback、referral 與限制。
- `docs/community-schema.md`：table、views、status、reply count 與 Functions 寫入路徑。
- `docs/community-security.md`：RLS、hash、Origin、validation、rate limit、Turnstile 與 Analytics 安全。
- `docs/community-moderation.md`：查詢、隱藏、恢復、deleted、檢舉結案、濫用來源與個資處理 SQL。

## Analytics 事件

保留核心 Funnel，新增或統一：

- Result：`result_hero_viewed`、`result_primary_cta_clicked`、`result_share_clicked`、`result_alternate_role_opened`、`result_profile_expanded`、`result_profile_collapsed`、`result_job_card_clicked`。
- Compare：`role_compare_started`、`role_compare_completed`、`role_compare_job_opened`。
- Share：`share_preview_opened`、`share_image_generation_started`、`share_image_generated`、`share_image_generation_failed`、`share_native_started`、`share_native_completed`、`share_native_cancelled`、`share_image_downloaded`、`share_link_copied`、`shared_result_landed`、`shared_result_quiz_started`、`shared_result_quiz_completed`。
- Community：`community_viewed`、`community_filter_selected`、`community_sort_changed`、`community_post_form_opened`、`community_post_submitted`、`community_post_failed`、`community_post_opened`、`community_reply_form_opened`、`community_reply_submitted`、`community_reply_failed`、`community_report_opened`、`community_report_submitted`。

# 2. 需要部署的東西

## 必須做／人工執行

1. 將更新包覆蓋到目前 repository；不要刪除 `.git`、`data`、`images` 或 `analytics-config.js`。
2. 執行 `npm run validate`。
3. 在 staging Supabase 執行 `002_community_board.sql`。
4. 設定 Netlify Functions variables：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `COMMUNITY_HASH_SALT`
   - `COMMUNITY_ALLOWED_ORIGINS`
5. Netlify 使用 Node 24、`npm run build`、publish `dist`、functions `netlify/functions`。
6. staging 測試後，再對 production 執行 migration 與部署。

## 已自動完成

- 前端與 Functions 程式。
- RLS migration、views、triggers、indexes。
- Node 24 CI。
- 本地 QR library。
- Build 保留既有 analytics config。
- Analytics contract compatibility。

## 選配

- Public `VITE_SUPABASE_*` variables；不設定時沿用目前 `analytics-config.js`。
- Cloudflare Turnstile。第一版維持 `COMMUNITY_REQUIRE_TURNSTILE=false`，直到前端 challenge flow 完成。

## Rollback

- 前端：Netlify 回復上一個 production deploy，或 Git `revert` 本次 commit。
- Functions：舊前端不會呼叫新 endpoints，可暫時保留。
- Database：優先保留 tables；確定不要資料後才執行 rollback SQL。

# 3. 其他注意事項

- Web Share 是否支援分享 File 取決於瀏覽器；不保證直接發布 Instagram Stories。
- iOS／Android fallback 為下載 PNG＋複製連結。
- QR generator 已 smoke test，但仍需以正式網域與手機相機實際掃描。
- 留言板 rate limit 目前以查詢計數實作，高流量時可能有競態；下一版應改原子 RPC／外部 rate-limit store。
- Turnstile 後端已支援，但前端尚未啟用 challenge widget。
- 管理員仍需每日處理 open reports；第一版沒有完整後台與永久 fingerprint blocklist。
- 職缺來源與失效狀態仍沿用既有資料更新政策。
- 上線第一週應監控 Funnel、Clarity Lift、題目偏斜／改答／退出、Job CTR、分享失敗率、Functions 4xx／5xx／429 與 open reports。
