# Data Matters v3.2 修正報告

## 1. 職涯圖鑑滑動

- 不再使用 `scrollIntoView()` 判定與移動卡片。
- 改用容器中心點與每張卡片的 `getBoundingClientRect()` 計算 active card。
- 箭頭操作直接依 `_activeIndex` 前進，連續點擊不會卡在同一張。
- 使用 `element.scrollTo()` 精準置中，第一張與最後一張都可正確到達。
- 新增 pointer drag，桌面拖曳與手機左右滑動都會在放開後吸附最近角色。
- 滑動期間抑制誤觸卡片 Modal。
- active card 唯一放大；非 active 卡片維持縮小與低透明度。
- ResizeObserver 在視窗／版面變動後重新置中目前角色。

## 2. 工作重心座標軸

- 移除新版 Grid 與舊 `.spectrum-plot` 軸標混用的結構。
- Y 軸固定為：上方「改變整個組織」、下方「解決單一問題」。
- 「工作主要影響誰？」放在獨立垂直軸線，不再壓到圖表。
- X 軸標題、左右端說明與免責文字全部放在圖表正下方。
- 四象限文字只存在圖表內，不再使用偽元素空白排版。
- 手機版仍保留完整軸說明，不會整段消失。

## 3. 留言板載入

- `community-read` 優先讀取公開 View。
- 若 View 尚未建立或權限未生效，伺服器改讀 base table 的明確公開欄位，並強制 `status=visible`。
- fallback 不會回傳 session ID、hash、moderation reason 等管理欄位。
- 新增可辨識的設定錯誤：環境變數缺失、schema 缺失、權限缺失。
- 新增 `005_repair_community_read.sql`，重建 View、補 service-role 權限並刷新 PostgREST schema cache。
- 新增 runtime test，模擬 View 不存在時成功 fallback。

## 需要人工執行

已建立 Community 三張表的正式環境，請在 Supabase SQL Editor 執行：

```text
supabase/migrations/005_repair_community_read.sql
```

接著重新部署 Netlify，讓新版 `community-read.js` 生效。
