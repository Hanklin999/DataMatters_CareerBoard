# 套用 Data Matters v3.8

## 1. 解壓縮

將 ZIP 解壓到任意資料夾。

## 2. 執行覆蓋腳本

```powershell
Set-ExecutionPolicy -Scope Process Bypass

.\apply-update.ps1 `
  -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
```

腳本會保留：

- `.git`
- `analytics-config.js`
- `data/`
- `images/`

## 3. 在正式 repository 驗證

```powershell
cd "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
npm run validate
```

## 4. Commit 與 Push

```powershell
git status
git add -A
git commit -m "Fix mobile result, role sharing, atlas clicks and community URL"
git push origin master
```

## 5. Netlify

1. 確認 Production deploy 使用最新 commit。
2. Environment variables 按 `docs/community-deploy-step-by-step.md` 設定。
3. Deploys → Trigger deploy → Clear cache and deploy site。
4. 打開健康檢查：

```text
https://datamatters-hanks-career-board.netlify.app/.netlify/functions/community-health
```

5. 測試角色分享網址：

```text
https://datamatters-hanks-career-board.netlify.app/share/data-science-applied-modeling
```
