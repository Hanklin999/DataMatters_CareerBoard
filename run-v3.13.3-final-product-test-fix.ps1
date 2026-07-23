$ErrorActionPreference = "Stop"

if (-not (Test-Path ".\fix-v3.13.3-final-product-tests.mjs")) {
    throw "找不到 fix-v3.13.3-final-product-tests.mjs"
}

Write-Host "套用最終 product test 同步"
& node .\fix-v3.13.3-final-product-tests.mjs
if ($LASTEXITCODE -ne 0) {
    throw "測試檔同步失敗。"
}

Write-Host ""
Write-Host "確認三個測試檔不再含舊文案"
$stale = Select-String `
  -Path .\tests\direct-card-click-runtime.test.mjs, .\tests\home-card-fan.test.mjs, .\tests\mobile-role-readability.test.mjs `
  -Pattern "翻開我的職涯角色|每次打開都會遇見不同角色|需要 Python、統計建模與解釋模型結果的能力|技術難度|技術深度|3\.13\.2"

if ($stale) {
    $stale | Format-Table Path, LineNumber, Line -AutoSize
    throw "仍找到舊版 assertion，停止測試。"
}

Write-Host ""
Write-Host "執行 product tests"
& npm.cmd run test:product
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "請貼出最後的 failing tests 區段；不要再執行舊修正腳本。"
    throw "product tests 仍未通過。"
}

Write-Host ""
Write-Host "執行完整驗證"
& npm.cmd run validate
if ($LASTEXITCODE -ne 0) {
    throw "完整驗證未通過，請先不要 commit。"
}

Write-Host ""
Write-Host "全部測試與 build 已通過。"
Write-Host "下一步：git status --short"
