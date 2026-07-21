# 套用 Data Matters v3.9

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\apply-update.ps1 -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
```

套用後：

```powershell
cd "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
npm run validate
git add -A
git commit -m "Fix mobile result portrait frame"
git push origin master
```

在 Netlify 執行 **Clear cache and deploy site**。部署完成後，以 iPhone Safari 無痕頁面重新測驗。
