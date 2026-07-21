# Data Matters｜資料科學分析地圖

協助大學生與資料職涯探索者，理解不同資料工作的差異，並找出適合自己的方向。

**Live Demo**：https://datamatters-hanks-career-board.netlify.app/

## 解決的問題

Data Analyst、Data Scientist、Data Engineer、Product Analyst……這些職稱聽起來很像，實際工作內容卻天差地遠。本專案用「工作類型 × 應用領域 × 產業 × 程式與技術投入程度」整理資料職涯路徑，讓沒有背景的人也能看懂差別、找到起點。

## 主要功能

- 約 3 分鐘、18 題的職涯探索測驗（工作情境題，不需要懂術語）
- 九大資料職涯角色（RPG 角色包裝＋正式職涯名稱）
- 三條推薦探索路線（最適合／鄰近選項／挑戰選項）
- 常見入門職稱與進階發展職稱（含 Architect 類職涯說明）
- 工作偏好輪廓（六軸圖）與結果信心說明
- 產業／領域兩層篩選，對照可查證來源的真實職缺
- 全部於瀏覽器端即時計算，不上傳、不儲存任何作答

## Demo 截圖

<!-- TODO：截圖後放入 docs/screenshots/（建議：首頁、測驗頁、結果頁、職涯圖鑑） -->

## 方法

測驗分三站：你想解決什麼問題、你喜歡如何工作、你想要什麼工作環境。系統把回答轉成與九種職涯角色「工作內容偏好」的相似程度，取前三名作為探索路線。科系背景只用於估計入門優勢與差距；環境偏好（收入、名聲、穩定、強度）只用於環境摘要與產業建議，都不影響職能排名。

這是探索工具，不是能力、人格或錄用測驗。

## 分類架構

- 工作類型（Functional Job Family）× 9
- 應用領域（Domain）
- 產業（Industry)
- 程式與技術投入程度（Technical Depth，T1–T5）

## 技術架構

HTML＋CSS＋Vanilla JavaScript＋JSON，部署於 Netlify。

## 本機執行

因為網站以 fetch 載入 JSON，請用本機伺服器開啟（不要直接雙擊 index.html）：

```bash
python -m http.server 8000
```

開啟 `http://localhost:8000`。

## 專案結構

```text
├── index.html          # 單頁入口（首頁/測驗/結果/圖鑑/關於）
├── app.js              # 題庫、三分數配對邏輯、渲染
├── styles.css          # 深色科技奇幻主題
├── data/
│   ├── careers.json    # 9 角色資料＋真實職缺（含來源連結）
│   └── skills.json     # 技能分類（保留供未來使用）
├── images/             # 9 角色卡圖＋9 代表物小圖
├── validate-data.mjs   # 資料驗證腳本（node validate-data.mjs）
└── test-cases.mjs      # 演算法驗收測試（node test-cases.mjs）
```

## 資料來源與限制

- 職缺與薪資僅採用公司官方職缺頁、官方揭露、政府調查，或 104／Cake／Yourator 等轉載官方職缺的平台；查不到的資料標示「暫無公開資料」，不推估、不編造。
- 職缺可能隨時間關閉或失效，申請前請以來源連結的官方頁面為準。
- 職涯分類、角色說明與配對結果皆為探索用途，非經心理計量驗證的測驗。

## Privacy

測驗與配對運算皆在瀏覽器內完成；不需登入、不使用 localStorage 建立永久識別、不收集姓名／Email／完整測驗答案等可直接識別個人的資料。為改善產品，本站以 Supabase 匿名記錄使用事件（頁面瀏覽、測驗進度、推薦角色與互動），僅用於整體使用分析。詳見網站「關於本站」的匿名使用分析說明與 [docs/analytics-setup.md](docs/analytics-setup.md)。

## Analytics

匿名埋點架構、Supabase 建立步驟、事件字典與驗證方式：[docs/analytics-setup.md](docs/analytics-setup.md)。分析查詢集：`supabase/analytics_queries.sql`。

## Roadmap

- 使用者測試與題目辨識力驗證
- 職缺資料定期更新與失效檢查
- 角色比較功能
- 無障礙持續改善
- 配對規則校準

## 作者

Hank Lin — 聯絡：data.matters.hank4@gmail.com

## License

License 尚未決定，未經授權不得重製或重新散布。
