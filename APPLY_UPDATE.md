# 套用 Data Matters v3.6

在解壓後資料夾開啟 PowerShell：

```powershell
Set-ExecutionPolicy -Scope Process Bypass

.\apply-update.ps1 `
  -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
```

接著回到 repository：

```powershell
npm run validate
git status
git add -A
git commit -m "Fix community server and role detail interactions"
git push origin master
```

Push 後讓 Netlify 重新部署。

留言功能還需要完成 Netlify server-only environment variables；詳見 `docs/community-server-setup.md`。
