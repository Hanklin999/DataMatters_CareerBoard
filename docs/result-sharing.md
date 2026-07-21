# 探索結果分享

## 圖片生成架構

`product-v3.js` 使用 Canvas API 建立固定 1080 × 1920 PNG，不直接截取結果頁。生成前等待 `document.fonts.ready`，再載入本地角色圖片與 QR Code。

內容只有品牌、RPG 名稱、真實職能名稱、角色圖片、一句描述、三個偏好標籤、邀請文字、網域與 QR Code。檔名為 `data-matters-[role-id]-story.png`。

## Story Safe Area

- 上方至少 180px。
- 下方至少 250px。
- 左右至少 90px。
- QR Code 位於安全區內，保持白底與足夠 quiet zone。

## Referral URL

```text
/?utm_source=instagram
 &utm_medium=story
 &utm_campaign=result_share
 &utm_content=[role_id]
```

URL 不包含答案、session ID、清楚度評分、暱稱或任何個人資料。

## Web Share

先檢查 `navigator.share`、`navigator.canShare` 與 file support。支援時分享 PNG、短文與 referral URL。

純網頁無法保證直接發布到 Instagram Stories。作業系統與 Instagram 是否出現在分享面板，由瀏覽器、裝置與已安裝 App 決定。

## Fallback

不支援 file share 時：

1. 下載 PNG。
2. 複製 referral URL。
3. 顯示「圖片已儲存，網站連結也已複製。打開 Instagram 後加入限時動態即可。」

桌面版提供下載圖片與複製連結。

## Analytics Funnel

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

開啟分享面板不視為完成分享。Web Share 成功回傳只代表系統分享流程完成，不保證使用者真的發布到特定 App。

## Browser 限制

- Web Share file support 依瀏覽器與 OS 而異。
- Clipboard API 通常需要 HTTPS 與使用者手勢。
- Canvas 若載入未允許 CORS 的遠端圖片會污染；本專案只使用同源本地角色資產。
- CDN QR 元件載入失敗時，圖片生成會停止，但不影響結果頁與複製連結。
