# Apply Data Matters v3.5

1. Extract this package.
2. Open PowerShell in the extracted folder.
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\apply-update.ps1 -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
```

4. In the repository run:

```powershell
npm run validate
git add -A
git commit -m "Fix mobile result hero layout"
git push origin master
```

5. Trigger a fresh Netlify deploy. The updated asset query strings help bypass stale mobile Safari cache.
