# Data Matters 修改進度（2026-07-21）

## 結論

目前完成的是可合併到完整 GitHub repository 的 **source overlay**，不是已部署完成版本。

- 實作完成度（程式與文件）：約 75%
- 可部署完成度：約 50–55%
- Phase 1：主要程式已完成，但尚未與完整原始資產整合及瀏覽器驗收
- Phase 2：雙角色比較、分享結果、留言板已有程式，尚未做真實 Supabase／Netlify E2E
- Phase 3：主要文件、migration、部署說明已完成

## 已完成

### 核心體驗

- 首頁資訊簡化與匿名分析聲明
- 18 題三站式題庫
- `preferenceScores`、`backgroundScores`、`environmentScores` 三分數架構
- 科系只進背景分數；收入、品牌、穩定、生活平衡、強度只進環境分數
- Slider 支援 `lowIsMeaningful`，避免錯誤反向加分
- `FAMILY_ADJACENCY` 與三條探索路線
- 信心分數、High／Medium／Low、Clear／Mixed／Exploratory
- 低信心提示
- 結果頁新資訊順序：Hero → 為什麼像你 → 常見工作 → 其他方向 → 完整輪廓 → 真實職缺 → 分享與回饋
- 主結果 Hero 簡化
- 真實職缺預設直接顯示最多 6 筆
- 完整輪廓 Accordion 與展開／收合事件
- 新工作重心地圖與 9 個不重疊座標
- Clarity Before／After 與 Accuracy Rating hook
- 題目層級 response time、修改答案與 mapping version 埋點

### 探索功能

- 雙角色比較 UI 與 Analytics
- 1080 × 1920 Story 分享圖生成
- QR Code、Web Share files support、下載與複製連結 fallback
- Referral URL 不包含 session 或作答內容
- 匿名留言板：留言、回覆、分類、排序、檢舉
- 前端 Honeypot、最短填寫時間、字數限制與個資格式阻擋
- Netlify Functions：read／submit／report
- Server-side rate limit 與 IP／UA hash
- Supabase RLS、公開 View、管理欄位隔離與 rollback migration

### 文件

- `README.md`
- `DEPLOYMENT.md`
- `docs/methodology.md`
- `docs/question-diagnostics.md`
- `docs/result-sharing.md`
- `docs/community-schema.md`
- `docs/community-security.md`
- `docs/community-moderation.md`

## 已新增或修改檔案

- `index.html`：首頁、結果容器、留言板、關於頁、腳本載入
- `app.js`：18 題、三分數、配對、信心與基礎渲染
- `styles.css`：既有樣式調整
- `product-v3.js`：結果頁、工作重心地圖、比較、分享、Clarity UI
- `product-v3.css`：結果頁與手機版樣式、44px 控制、focus state
- `community.js`：留言板前端
- `analytics.js`、`analytics-config.js`：匿名 Analytics
- `netlify/functions/*.js`：留言板讀寫與檢舉 API
- `supabase/migrations/002_community_board.sql`：schema、RLS、Views、trigger
- `supabase/migrations/002_community_board_rollback.sql`：回滾
- `tests/product-v3.test.mjs`：9 項結構驗收
- `scripts/*.mjs`：local serve、static lint、build
- `package.json`、`netlify.toml`、`.env.example`、`.gitignore`
- README、Deployment 與 6 份 docs

## 驗證結果

### 通過

- JavaScript syntax check：通過
- `npm run lint`：通過
  - 8 個 JavaScript 檔案
  - 47 個唯一 HTML IDs
- `npm test`：9/9 通過
  1. 18 題與三分數系統
  2. 環境題不含 family mapping
  3. 結果頁資訊順序
  4. Story 尺寸與 referral fields
  5. 9 個不重疊地圖位置
  6. 留言板 server functions 與 Analytics 隱私
  7. RLS、公開 View、anon 權限
  8. 390px、focus、44px 控制
  9. 必要 Analytics events
- `npm run build:overlay`：通過

### 未通過／未執行

- `npm run build`：未通過
  - 原因：目前工作區缺少完整 repository 的 `data/careers.json` 與 `data/skills.json`
- GitHub 原始角色圖片未包含於此 overlay
- 原 repository 的 `validate-data.mjs` 與 `test-cases.mjs` 尚未在整合版執行
- Supabase migration 尚未在真實專案執行
- Netlify Functions 尚未以真實環境變數測試
- 留言、回覆、檢舉、rate limit 尚未做端到端測試
- 1080 × 1920 圖片尚未在 iPhone Safari／Android Chrome 實機驗證
- QR Code 尚未實際掃描驗證
- 390px 視覺 QA、桌面 QA、鍵盤與 Modal focus trap 尚未以瀏覽器自動化／實機驗證

## 下一步部署前必做

1. 將本 overlay 合併到 GitHub 最新 master。
2. 保留原始 `data/`、`images/`、既有 analytics migration 與資料驗證腳本。
3. 執行 `node validate-data.mjs` 與原本 `node test-cases.mjs`。
4. 執行 Supabase migration，確認 Views 與 RLS。
5. 設定 Netlify server-side Supabase key、hash secret、allowed origin；不可放到前端。
6. 執行完整 `npm run lint && npm test && npm run build`。
7. 用 localhost／Netlify Preview 做核心流程與手機測試。
8. 完成留言板與分享的端到端驗收後再上 production。

## 已知限制

- 純網頁無法保證直接發布到 Instagram Stories。
- Web Share File 支援依瀏覽器不同。
- 留言板的 Turnstile 為可選設定；啟用後需補 site key 與 secret。
- Anonymous Analytics 只能分析 session 行為，不能代表獨立真實使用者。
- 此版本沒有直接推送 GitHub 或修改 Netlify／Supabase production。
