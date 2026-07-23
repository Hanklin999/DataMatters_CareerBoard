$ErrorActionPreference = "Stop"

$root = Get-Location
$v312 = Join-Path $root "apply-v3.13.2-home-activation.ps1"
$v313 = Join-Path $root "apply-v3.13.3-copy-review.mjs"

if (-not (Test-Path $v312)) {
    throw "找不到 apply-v3.13.2-home-activation.ps1"
}
if (-not (Test-Path $v313)) {
    throw "找不到 apply-v3.13.3-copy-review.mjs"
}

Write-Host "步驟 1/2：套用 v3.13.2 首頁啟動優化"
powershell -ExecutionPolicy Bypass -File $v312

Write-Host ""
Write-Host "步驟 2/2：套用 v3.13.3 全站文字易讀性調整"
node $v313

Write-Host ""
Write-Host "執行驗證"
npm run validate

Write-Host ""
Write-Host "完成。請檢查："
Write-Host "git diff -- index.html product-v3.css app.js product-v3.js community.js data/careers.json"
Write-Host ""
Write-Host '確認後執行：'
Write-Host 'git add index.html product-v3.css app.js product-v3.js community.js data/careers.json'
Write-Host 'git commit -m "Update homepage and simplify copy for student audiences"'
Write-Host 'git push'
