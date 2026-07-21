# Apply the update

The package is an overlay for the current Data Matters repository. It does not include or replace `data/`, `images/`, `analytics-config.js`, `test-cases.mjs`, or `validate-data.mjs`.

## PowerShell

```powershell
Set-ExecutionPolicy -Scope Process Bypass

.\apply-update.ps1 `
  -RepoPath "C:\Users\chihh\OneDrive\文件\GitHub\DataMatters_CareerBoard"
```

Then run inside the repository:

```powershell
npm install
npm run generate:analytics-schema
npm run test:analytics-contract
npm run validate
npm run build
```

Check the generated files are committed:

```powershell
git status
git add -A
git commit -m "Centralize analytics event contract"
git push origin master
```

Apply the Supabase migration only after the preflight query returns no legacy event names. See `SUPABASE_DEPLOYMENT.md`.
