# 套用方式

這是一份 Data Matters v3 source overlay，不包含原 repository 的 `data/`、`images/`、既有 `.github/` workflows、`validate-data.mjs` 與 `test-cases.mjs`。

1. 先備份或建立 Git branch。
2. 將本壓縮檔內容解壓縮到 repository 根目錄，允許覆蓋同名檔案。
3. 保留原 repository 的 `data/`、`images/` 與未包含的既有檔案。
4. 執行：

```bash
npm run lint
npm test
node validate-data.mjs
node test-cases.mjs
npm run build
```

5. 依 `DEPLOYMENT.md` 執行 Supabase migration 與 Netlify 設定。

目前已驗證 `npm run lint`、`npm test`、`npm run build:overlay`；完整 build 必須在含原始 data/images 的 repository 執行。
