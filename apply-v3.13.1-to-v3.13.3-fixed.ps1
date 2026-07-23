$ErrorActionPreference = "Stop"

$root = Get-Location
$v312 = Join-Path $root "apply-v3.13.2-home-activation-fixed.ps1"
$v313 = Join-Path $root "apply-v3.13.3-copy-review.mjs"

if (-not (Test-Path $v312)) { throw "找不到 apply-v3.13.2-home-activation-fixed.ps1" }
if (-not (Test-Path $v313)) { throw "找不到 apply-v3.13.3-copy-review.mjs" }

Write-Host "步驟 1/2：套用 v3.13.2"
& powershell -ExecutionPolicy Bypass -File $v312
if ($LASTEXITCODE -ne 0) {
    throw "v3.13.2 套用失敗，已停止，不會繼續執行 v3.13.3。"
}

Write-Host ""
Write-Host "步驟 2/2：套用 v3.13.3"
& node $v313
if ($LASTEXITCODE -ne 0) {
    throw "v3.13.3 套用失敗，已停止驗證。"
}

Write-Host ""
Write-Host "執行驗證"
& npm run validate
if ($LASTEXITCODE -ne 0) {
    throw "驗證失敗，請先不要 commit。"
}

Write-Host ""
Write-Host "完成。請執行："
Write-Host "git status --short"
Write-Host "git diff -- index.html product-v3.css app.js product-v3.js community.js data/careers.json"
Write-Host ""
Write-Host '確認後：'
Write-Host 'git add index.html product-v3.css app.js product-v3.js community.js data/careers.json'
Write-Host 'git commit -m "Update homepage and simplify copy for student audiences"'
Write-Host 'git push'
