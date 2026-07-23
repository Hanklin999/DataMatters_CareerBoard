$ErrorActionPreference = "Stop"

$script = Join-Path (Get-Location) "apply-v3.13.3-copy-review-retry.mjs"
if (-not (Test-Path $script)) {
    throw "找不到 apply-v3.13.3-copy-review-retry.mjs"
}

Write-Host "重新套用 v3.13.3（可安全重複執行）"
& node $script
if ($LASTEXITCODE -ne 0) {
    throw "v3.13.3 仍未完成，已停止。"
}

Write-Host ""
Write-Host "執行驗證"
& npm run validate
if ($LASTEXITCODE -ne 0) {
    throw "驗證失敗，請先不要 commit。"
}

Write-Host ""
Write-Host "完成。請檢查："
Write-Host "git status --short"
Write-Host "Select-String -Path .\index.html -Pattern DATA_MATTERS_APP_VERSION"
Write-Host "git diff -- index.html product-v3.css app.js product-v3.js community.js data/careers.json"
