# 套用 Data Matters v3.7

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\apply-update.ps1 -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"

cd "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
npm run validate
git add -A
git commit -m "Fix direct role card details and community diagnostics"
git push origin master
```

Push 後到 Netlify 重新 Deploy。

部署完成後開啟：
`https://datamatters-hanks-career-board.netlify.app/.netlify/functions/community-health`

- `ok:true`：設定與資料庫正常。
- `server_not_configured`：依 `missing`／`invalid` 欄位修正。
- `community_schema_missing`：執行 Supabase migration。
- `community_permission_missing`：執行 community read repair migration。
