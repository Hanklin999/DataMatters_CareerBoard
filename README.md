# Data Matters v3.9 mobile result portrait fix

此套件以 v3.8 為基礎，修正手機測驗結果頁的角色圖與正方形外框未貼合問題。

核心調整：

- Hero 圖片由 `contain` 改成 `cover`。
- 圖片固定填滿正方形外框並置中。
- 清除 padding、margin 與舊 transform 造成的偏移。
- 以最高優先級最終規則防止舊 CSS 蓋回留白版面。
- 靜態資源版本更新為 v3.9，降低 Safari 快取舊 CSS 的機率。

套用方式請看 `APPLY_UPDATE.md`。
