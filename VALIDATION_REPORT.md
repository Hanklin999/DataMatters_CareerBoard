# Data Matters v3.1 Validation Report

執行日期：2026-07-21

## 已實際執行

### JavaScript syntax / static lint

```text
Static lint passed: 8 JavaScript files, 48 unique HTML ids.
```

結果：通過。

### Product tests

```text
13 tests
13 passed
0 failed
```

涵蓋：

- 18 題與三分數系統
- 環境題不影響職能排名
- 結果頁資訊順序
- 1080 × 1920 分享圖
- 分享圖角色圖放大且移除 QR Code
- 九個工作重心座標
- Community server functions／RLS
- 390px 與 44px controls
- Analytics 事件
- 個資與垃圾訊息阻擋
- 留言板不再要求分類
- 結果頁英文職能名稱與完整正方形圖片
- 職涯圖鑑單卡橫向牌組

結果：13 / 13 通過。

### Production build

使用整合測試用 `analytics-config.js`、`data/` 與 `images/` 執行：

```text
Built /mnt/data/_v31_validate/dist
```

結果：通過。

## 未實際執行

目前交付包刻意不包含使用者 repository 的：

- `analytics-config.js`
- 真實 `data/`
- 真實 `images/`
- 原 repository 的 `test-analytics.mjs`
- 原 repository 的 `test-cases.mjs`
- 原 repository 的 `validate-data.mjs`

因此套用到實際 repository 後仍需執行：

```powershell
npm run validate
```

並在真實圖片與資料上做瀏覽器視覺確認。

## 尚需人工／實機驗證

- 真實九角色圖片是否全部完整顯示
- 390px 手機圖鑑滑動手感
- iPhone Safari／Android Chrome Web Share
- 分享 PNG 實際下載結果
- Supabase `004_simplify_community_category.sql`
- 真實留言、回覆、檢舉與 rate limit
