# Result Sharing

## 圖片生成架構

`product-v3.js` 使用 Canvas API 建立固定 1080 × 1920 PNG，不直接截取結果頁。生成前等待 `document.fonts.ready`，再載入 repository 內的角色圖片。

內容包含 Data Matters 品牌、RPG 名稱、中文與英文真實職能名稱、放大的正方形角色圖片、一句描述、三個偏好標籤、邀請文字與網站網域。第一版不放 QR Code。檔名為 `data-matters-[role-id]-story.png`。

## Story safe area

- 上方主要內容避開至少 180px。
- 下方保留約 150–250px，降低 Instagram UI 遮擋風險。
- 左右保留至少 90px。
- 角色圖片以 `contain` 完整顯示，不裁掉角色。

## Web Share

分享按鈕先檢查：

- `navigator.share`
- `navigator.canShare`
- File sharing support

支援時分享 PNG 與文字；不支援時提供下載圖片與複製連結。

## Download fallback

桌面與不支援檔案分享的瀏覽器會提供：

- 下載 PNG
- 複製 referral URL

## Referral URL

格式：

```text
/share/[role_id]?utm_source=instagram&utm_medium=story&utm_campaign=result_share&utm_content=[role_id]
```

`/share/[role_id]` 由 Netlify Function 輸出角色專屬 Open Graph metadata，社群預覽會顯示對應角色圖片，而不是網站通用圖片。使用者開啟連結後會回到首頁。

下載按鈕仍提供瀏覽器即時產生的 1080 × 1920 PNG；複製連結的社群預覽使用 repository 內的角色卡圖片，以確保公開網址與跨平台相容性。

不得包含完整答案、session ID、評分、暱稱或其他個人資料。

## Analytics funnel

- `share_preview_opened`
- `share_image_generation_started`
- `share_image_generated`
- `share_image_generation_failed`
- `share_native_started`
- `share_native_completed`
- `share_native_cancelled`
- `share_image_downloaded`
- `share_link_copied`
- `shared_result_landed`
- `shared_result_quiz_started`
- `shared_result_quiz_completed`

開啟面板不視為完成分享。

## Browser limits

Web Share 的檔案支援依瀏覽器與作業系統而異。分享失敗不得影響結果頁；使用者仍可下載圖片或複製連結。
