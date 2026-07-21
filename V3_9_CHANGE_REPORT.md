# Data Matters v3.9 — 手機結果角色圖對齊修正

## 修正內容

- 將測驗結果 Hero 圖片所有 `object-fit: contain` 規則改為 `cover`。
- 圖片固定填滿 1:1 外框，不再產生上方或下方色塊留白。
- `object-position` 固定為中央，避免圖片偏上或偏下。
- 外框強制 `overflow: hidden`、`padding: 0`，圖片 `margin: 0`。
- 手機寬度改為 `min(88vw, 360px)`，並以 `place-self: center` 置中。
- 更新靜態資源版本到 v3.9，避免 Safari 延用 v3.8 CSS。
- 新增 regression test，確保結果 Hero 不再出現任何 `contain` 規則。

## 視覺取捨

`cover` 會在來源圖不是正方形時裁切少量左右或上下邊緣，但不會扭曲圖片；這比保留大面積色塊留白更符合目前的角色卡外框設計。
