# 套用 Data Matters v3 更新

本包是針對目前 GitHub `master` 的更新檔，不是新 repository。

## 保留不動

更新包刻意不包含：

- `.git/`
- `analytics-config.js`
- `data/`
- `images/`
- `test-analytics.mjs`
- `test-cases.mjs`
- `validate-data.mjs`
- 原本的 Analytics migration／queries

## 最簡單方式

1. 關閉正在執行 Git 操作的 GitHub Desktop／終端。
2. 將 zip 解壓到任意暫存資料夾。
3. 執行：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\apply-update.ps1 -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
```

4. 進入 repository：

```powershell
cd "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
npm run validate
git status
git add -A
git commit -m "Upgrade Data Matters to v3"
git push origin master
```

## OneDrive 注意

若 `.git/index.lock` 或 `.git/objects` 再被鎖住，先關閉 GitHub Desktop、暫停 OneDrive 同步，再重試。不要刪除 `.git`、不要 `git reset --hard`、不要 force push。

## 部署

程式 push 前後都可先看 `DEPLOYMENT.md`。留言板真正可用前，必須先做 Supabase migration 與 Netlify Functions environment variables。


## v3.1 額外資料庫步驟

若正式 Supabase 已建立 `community_posts`，請再執行：

```text
supabase/migrations/004_simplify_community_category.sql
```

它只把前端隱藏的 `category` 欄位預設值改為「一般討論」，不刪除既有留言。

## 本次介面修正

詳細內容請看 `V3_1_CHANGE_REPORT.md`。
