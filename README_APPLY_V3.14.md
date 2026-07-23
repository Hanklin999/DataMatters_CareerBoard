# Data Matters v3.14 套用方式

## 建議方式：直接覆蓋

把 bundle 解壓縮到 Repo 根目錄，確認以下檔案與 `app.js` 同一層：

```text
app.v3.14.js
test-cases.v3.14.mjs
v3.14-scoring-audit.mjs
apply-v3.14.ps1
```

執行：

```powershell
powershell -ExecutionPolicy Bypass -File .\apply-v3.14.ps1
```

腳本會：

1. 建立 `backup-v3.14-日期時間`。
2. 以 `app.v3.14.js` 覆蓋 `app.js`。
3. 以 `test-cases.v3.14.mjs` 覆蓋 `test-cases.mjs`。
4. 將 `scripts/build.mjs` 更新為：

```javascript
APP_VERSION: "v3.14"
SCORING_VERSION: "v3.14-calibrated"
```

5. 若 `analytics-config.js` 已有版本欄位，只更新版本，不修改 Supabase URL 或 key。
6. 執行 scoring audit。
7. 執行 `npm.cmd run validate`。

## 不使用腳本時

```powershell
Copy-Item .\app.v3.14.js .\app.js -Force
Copy-Item .\test-cases.v3.14.mjs .\test-cases.mjs -Force
node .\v3.14-scoring-audit.mjs
npm.cmd run validate
```

再手動修改 `scripts/build.mjs`：

```javascript
APP_VERSION: "v3.14",
SCORING_VERSION: "v3.14-calibrated"
```

## 驗證通過後

```powershell
git status --short
git diff --stat
git add app.js test-cases.mjs scripts/build.mjs analytics-config.js index.html
git commit -m "Redesign questionnaire and calibrate scoring for v3.14"
git push
```

若 `analytics-config.js` 或 `index.html` 沒有修改，Git 會自動忽略。

## 注意

- 不要提交 `backup-v3.14-*`。
- 不要把 Supabase secret/service-role key 寫進前端。
- 本 bundle 已做 syntax check 與獨立 scoring audit；仍須在你的完整 Repo 執行 `npm.cmd run validate`，才能確認與現有 data、product tests、build 的整合結果。
