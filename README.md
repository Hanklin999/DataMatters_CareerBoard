# Data Matters

> 幫助沒有背景知識的使用者，理解資料職涯差異並找到可探索方向。

[Live Demo](https://datamatters-hanks-career-board.netlify.app/) · [方法說明](docs/methodology.md)

## 1. Problem

Data Analyst、BI、Data Scientist、Data Engineer、Product Analyst 等職稱經常重疊，同一職稱在不同公司也可能做完全不同的事。初學者容易從熱門工具、薪資或科系開始選，卻仍不知道每天實際會做什麼。

## 2. User

- 正在探索資料職涯的大學生。
- 沒有資訊或資料背景的學生。
- 轉職初期、第一次理解資料工作的人。
- 正在準備實習、課程或作品集的人。

## 3. Product Hypothesis

若把抽象人格題改成生活情境題，並用九個角色、工作重心、真實職稱與職缺呈現差異，使用者能更快理解資料工作的實際內容，並找到下一個可執行行動。

## 4. Solution

- 九角色 Job Family taxonomy。
- 18 題、三站式生活情境測驗。
- 最接近、鄰近與延伸三條探索路線。
- 「你的工作重心」視覺化。
- 雙角色比較。
- 直接顯示常見工作與真實職缺。
- 1080 × 1920 結果分享圖。
- 匿名、一層回覆的低複雜度留言板。
- 技能差距、環境偏好與下一步。

## 5. Information Architecture

```text
首頁
 ├─ 開始探索
 │   ├─ 工作問題與目前起點
 │   ├─ 工作方式
 │   ├─ 工作環境
 │   └─ 結果
 │       ├─ 第一推薦 Hero
 │       ├─ 為什麼像你
 │       ├─ 可能做的工作
 │       ├─ 其他方向
 │       ├─ 完整職涯輪廓（收合）
 │       ├─ 真實職缺
 │       ├─ 分享
 │       └─ 回饋
 ├─ 九大職涯
 ├─ 留言板
 └─ 關於／限制／隱私
```

## 6. Matching Logic

計分分為三個獨立系統：

- **Preference**：工作內容偏好，主要決定 Job Family。
- **Background**：目前起點，用於入門優勢、技能差距與延伸方向。
- **Environment**：收入、品牌、穩定、生活平衡與強度，只用於環境摘要與 trade-off。

科系與環境題不直接決定最適合角色。Slider 只有在低分確實代表反向偏好時才對另一側加分。完整邏輯見 [docs/methodology.md](docs/methodology.md)。

## 7. Product Analytics

Supabase 儲存匿名事件與 session ID，用於：

- Landing → Quiz → Result funnel。
- Quiz completion 與每站退出率。
- 題目作答時間、修改率與選項偏斜。
- Clarity Before／After 與 Clarity Lift。
- Role Open、Alternate Role Exploration 與 Job CTR。
- 分享圖生成、分享與 referral conversion。
- 留言板參與、回覆、檢舉與錯誤率。

不傳姓名、Email、電話、留言、暱稱、完整答案或明文 IP。題目診斷見 [docs/question-diagnostics.md](docs/question-diagnostics.md)。

## 8. Iterations

- 簡化首頁與隱私聲明。
- 把抽象題改為生活情境。
- 拆分 Preference／Background／Environment。
- 修正 Slider 假對立。
- 結果頁改為漸進揭露。
- 重做工作重心地圖。
- 加入 Clarity Lift。
- 加入雙角色比較。
- 加入 Story 分享結果。
- 加入匿名留言板與伺服器端防濫用。

## 9. Success Metrics

- Quiz Start Rate。
- Quiz Completion Rate。
- Qualified Exploration Rate。
- Average Clarity Lift。
- Role Open Rate。
- Alternate Role Exploration Rate。
- Job CTR。
- Accuracy Rating。
- Share Conversion。
- Community Participation Rate。

## 10. Limitations

結果來自自陳偏好，不是能力或心理測驗；角色可能重疊，職缺也受地區與更新時間影響。目前尚未完成正式心理計量驗證。詳見 [方法說明](docs/methodology.md) 與網站「關於」。

## 11. Tech Stack

- HTML5、CSS3、Vanilla JavaScript。
- Supabase Postgres／REST／RLS。
- Netlify Hosting／Functions。
- Canvas API、Web Share API、Clipboard API。

## 12. Local Development

需要 Node.js 22 以上；不需要安裝額外套件。

```bash
npm run dev
```

或直接使用任一靜態伺服器：

```bash
python -m http.server 8888
```

不要用 `file://` 開啟，否則 JSON、Clipboard 與部分瀏覽器 API 可能失效。

## 13. Environment Variables

### Public build variables（選配）

Repository 既有的 `analytics-config.js` 會被保留，不需為了本次更新重建 Supabase 專案。若在 Netlify 設定以下變數，build 只會在 `dist/` 生成部署版設定：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_ANALYTICS_ENABLED
VITE_ANALYTICS_ENV
VITE_ANALYTICS_DEBUG
VITE_TURNSTILE_SITE_KEY       # 選配；目前尚未啟用前端 challenge
```

### Netlify Functions only

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
COMMUNITY_HASH_SALT
COMMUNITY_ALLOWED_ORIGINS
TURNSTILE_SECRET_KEY          # 選配
COMMUNITY_REQUIRE_TURNSTILE   # 選配，true/false
```

`SUPABASE_SERVICE_ROLE_KEY` 絕對不能使用 `VITE_` 前綴，也不能出現在瀏覽器 bundle 或 GitHub。

## 14. Build and Validation

```bash
npm run lint
npm run validate:data
npm test
npm run build

# 一次執行全部
npm run validate
```

`build` 會將靜態檔案複製到 `dist/`，並把 public environment variables 注入 `analytics-config.js`。Migration 與 RLS 仍需在 Supabase 人工執行與檢查。

## 15. Deployment

部署順序與 rollback 見 [DEPLOYMENT.md](DEPLOYMENT.md)。留言板資料結構、安全與管理文件：

- [Community Schema](docs/community-schema.md)
- [Community Security](docs/community-security.md)
- [Community Moderation](docs/community-moderation.md)
- [Result Sharing](docs/result-sharing.md)

## 16. Roadmap

- 用 30–50 位目標使用者做正式可用性測試。
- 累積足夠樣本後檢查題目區辨力與重測穩定度。
- 建立受保護的管理後台與 fingerprint blocklist。
- 依異常流量加入 Turnstile 前端 challenge。
- 建立自動化跨瀏覽器與真機分享圖測試。


## v3.1 介面修正

- 結果頁保留英文職能名稱，角色圖改為更大的正方形完整顯示。
- 分享圖放大角色圖片，移除 QR Code 與 Instagram 限制提示。
- 職涯圖鑑改為一次聚焦一張卡的左右滑動牌組。
- 重建工作重心圖的 X／Y 軸與四象限標示。
- 留言板移除分類篩選與分類欄位，後端統一儲存為「一般討論」。
