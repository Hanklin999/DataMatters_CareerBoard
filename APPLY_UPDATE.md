# 套用 Data Matters v3.2

在解壓後資料夾開啟 PowerShell：

```powershell
Set-ExecutionPolicy -Scope Process Bypass

.\apply-update.ps1 `
  -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
```

腳本只覆蓋更新檔，不會修改：

- `.git`
- `analytics-config.js`
- `data/`
- `images/`

接著在 repository 執行：

```powershell
npm run validate
git status
git add -A
git commit -m "Fix career atlas, work-focus map and community loading"
git push origin master
```

## Supabase 必做

已建立 Community 表的專案，請執行：

```text
supabase/migrations/005_repair_community_read.sql
```

然後重新部署 Netlify。若未設定 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`COMMUNITY_HASH_SALT` 與 `COMMUNITY_ALLOWED_ORIGINS`，留言板仍無法連線。
