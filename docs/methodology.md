# Data Matters 方法說明

## 專案目的

Data Matters 幫助沒有資料職涯背景的使用者，用生活情境理解常見資料工作，取得可探索的方向、真實職稱與下一步。結果是探索框架，不是能力測驗，也不代表錄取機率或薪資。

## 九個 Job Family

1. Data Analytics & Business Intelligence：解釋現況、建立指標、支持決策。
2. Data Science：預測、實驗、統計建模與研究探索。
3. Machine Learning & AI Engineering：把模型做成穩定、可使用的功能。
4. Data Engineering & Analytics Engineering：建立可重複使用的資料流程與平台。
5. Operations Research & Decision Optimization：在成本、時間與資源限制下找最佳安排。
6. Strategy, Operations & Consulting：定義問題、規劃方案並推動跨部門執行。
7. Product, Systems & Solutions：把需求轉成流程、系統或產品功能。
8. Finance, Risk & Quantitative Analytics：衡量金錢、風險與不確定性。
9. Data Governance, Quality & Responsible Data：建立品質、規則、可信度與可追溯性。

九個角色沿用既有 taxonomy。RPG 名稱用於記憶與分享，真實職能名稱永遠是主要資訊。

## Domain、Industry 與 Job Family

- **Job Family**：每天主要做的工作。
- **Domain**：問題發生在哪個業務領域，例如產品、行銷、供應鏈或財務。
- **Industry**：工作所在產業，例如科技、金融、醫療或製造。

三者分開處理，避免把「在金融業」誤判成「一定適合量化金融」。

## 三個計分系統

### Preference Scores

只使用工作內容偏好題，包含問題類型、技術投入、模型與數學投入、跨部門互動、研究探索、執行落地、穩定交付、品質與風險。這是 Job Family 排名的主要依據。

單選題依選項對角色加權。Slider 使用非對稱規則：

```text
value >= 4:
  highFamilies += (value - 3) × weight

value <= 2 且 lowIsMeaningful:
  lowFamilies += (3 - value) × lowWeight
```

低分只有在確實代表相反偏好時才會加到另一側，避免「不想學演算法」自動變成其他職涯的正分。

### Background Scores

只表示目前起點：程式能力、統計與數學、商業與領域知識、軟體工程基礎。科系只進入 Background、Domain 與 Industry 的低權重參考，不直接決定最適合角色。

Background 用於：

- 顯示目前入門優勢。
- 顯示技能差距。
- 判斷延伸方向。

### Environment Scores

收入、品牌、工作保障、生活平衡與工作強度只形成工作環境摘要及產業 trade-off，不進入 Job Family 排名。

## 三條探索路線

### 最接近你

Preference Score 最高的角色。

### 也值得探索

從主角色的 `FAMILY_ADJACENCY` 鄰近角色中，選 Preference Score 最高者。鄰近關係代表常見技能、合作對象或產出相近，不代表職涯高低。

### 延伸方向

選擇偏好仍有契合、但目前背景差距較大的角色。高層次概念如下：

```text
challengeScore = preferenceScore - backgroundGapPenalty + aspirationBonus
```

結果會同時說明契合偏好與需要補強之處。

## 配對信心

信心不是測驗準確率。它綜合：

- 非中立回答比例。
- 第一名與第二、第三名差距。
- 有效偏好題覆蓋度。
- 回答是否互相矛盾。
- 九個角色分數是否過度接近。

前端使用「高度相符」「有幾個接近方向」「還在探索」。若保留 0–100 分，只能作為回答集中程度的次要資訊。

## 技術投入層級

主要前端使用「較少／中等／較多」。若資料中保留 T1–T5，僅作為方法文件或角色詳情的次要說明，不表示能力等級。

## 工作重心地圖

地圖只描述常見工作重心：

- X 軸：找答案 → 做出可用的東西。
- Y 軸：改變整個組織 → 解決單一問題。

角色位置是資訊架構工具，不代表能力、薪資或職涯高低。

## 職缺分類

真實職缺沿用既有資料來源與資料結構。第一推薦角色會直接顯示常見職稱與最多六筆職缺；Domain 與其他角色篩選是次要功能。職缺內容可能受來源、地區與更新時間影響。

## Product Analytics

匿名 session ID 儲存在瀏覽器 sessionStorage。事件用於：

- Landing → Quiz → Result funnel。
- 題目退出、作答時間與修改率。
- 角色與鄰近方向探索。
- Job CTR。
- Clarity Before／After 與 Clarity Lift。
- 分享漏斗。
- 留言板參與與錯誤率。

Analytics 不傳姓名、Email、電話、留言、暱稱、完整答案、明文 IP 或指紋。

## Clarity Lift

使用者開始前與閱讀結果後，各自選填 1–5 分：

```text
Clarity Lift = Clarity After - Clarity Before
```

主要看平均值與分布，也要搭配完成率，避免只分析願意填回饋的人。

## 目前驗證方式

- 題目選項分布與偏斜。
- 作答時間、修改率與題目退出率。
- 主角色與次角色差距。
- 使用者準確感評分。
- Clarity Lift。
- Role Open、Alternate Role Exploration 與 Job CTR。

## 未來驗證計畫

1. 先以 30–50 位目標使用者做可用性測試。
2. 比較非資訊背景與有背景使用者的理解差異。
3. 訪談低信心與高修改率題目的思考過程。
4. 以職涯顧問或從業者審查角色與職缺 mapping。
5. 累積樣本後再評估題目區辨力、內部一致性與重測穩定度。
