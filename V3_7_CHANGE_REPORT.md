# Data Matters v3.7 修正報告

## 1. 職涯圖鑑直接點擊
- 任一角色卡只要是單純點擊／觸控，就直接開啟詳細資訊。
- 不再要求先點一次把卡片移到中間、再點第二次。
- 拖曳後仍會抑制誤觸，鍵盤 Enter／Space 也能開啟。
- 使用 delegated event handler，重新 render 後不會失去事件。

## 2. 技術難度文案
角色卡改為兩行：
- `技術難度：T4-T5`
- `需要 Python、機器學習、資料系統能力`

能力文字優先取各角色 `starter_skills` 前三項，資料缺失時使用 T-level fallback。

## 3. 留言板設定與 Supabase Secret Key
- 錯誤畫面會列出實際缺少／無效的變數名稱。
- `COMMUNITY_HASH_SALT` 少於 32 字會明確顯示。
- 修正新版 `sb_secret_...` 的 header：只放 `apikey`，不再錯誤地當成 Bearer JWT。
- Legacy `service_role` JWT 仍同時支援。
- 健康檢查回傳 `url_source`、`key_source`、`salt_source`。

## 4. 快取
所有主要 CSS／JS 資產版本更新為 `3.7.0`。
