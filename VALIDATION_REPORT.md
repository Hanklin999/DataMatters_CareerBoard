# Validation Report — v3.9

實際執行：

```text
node --test tests/v39-result-art.test.mjs
npm run lint
npm run test:product
npm run build:overlay
```

結果：

- v3.9 手機圖片回歸測試：3 / 3 通過
- Product/runtime tests：40 / 40 通過
- Static lint：通過
- JavaScript files checked by static lint：8
- HTML IDs：48 個，無重複
- Overlay build：通過

新檢查：

- 結果 Hero 不得再出現 `object-fit: contain`。
- 最終圖片規則必須為 `width: 100%`、`height: 100%`、`object-fit: cover`。
- 圖片外框必須保持 1:1 並裁切溢出部分。

限制：

- 此交付包不包含正式 repository 的 `data/`、`images/`、`analytics-config.js`、`validate-data.mjs`、`test-analytics.mjs` 與 `test-cases.mjs`。
- 因此沒有宣稱完整 `npm run validate` 已在正式資料上通過；套用後必須在你的 repository 再執行。
- `cover` 在來源圖片不是正方形時會裁掉少量邊緣，但不會扭曲圖片，也不會再出現色塊留白。
