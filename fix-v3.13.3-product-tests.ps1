$ErrorActionPreference = "Stop"

$files = @(
    "tests/direct-card-click-runtime.test.mjs",
    "tests/home-card-fan.test.mjs",
    "tests/mobile-role-readability.test.mjs"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        throw "找不到 $file。請在 Repo 根目錄執行。"
    }
}

function Replace-Required {
    param(
        [string]$Path,
        [string]$Old,
        [string]$New,
        [string]$Description
    )

    $content = Get-Content $Path -Raw -Encoding UTF8

    if ($content.Contains($New)) {
        Write-Host "略過：$Description 已是新版"
        return
    }

    if (-not $content.Contains($Old)) {
        throw "找不到預期測試內容：$Description"
    }

    $content = $content.Replace($Old, $New)
    Set-Content $Path $content -Encoding UTF8
    Write-Host "已更新：$Description"
}

Replace-Required `
    "tests/direct-card-click-runtime.test.mjs" `
    '/技術難度：\$\{p\.tlevel_range\|\|"—"\}/' `
    '/技術學習：\$\{p\.tlevel_range\|\|"—"\}/' `
    "atlas 卡片技術文字"

Replace-Required `
    "tests/mobile-role-readability.test.mjs" `
    '/技術深度：\$\{p\.tlevel_range/' `
    '/技術學習：\$\{p\.tlevel_range/' `
    "角色詳情技術文字"

Replace-Required `
    "tests/home-card-fan.test.mjs" `
    '/每次打開都會遇見不同角色/' `
    '/點任一張卡也能開始測驗，選哪張都不會影響推薦結果。/' `
    "首頁卡牌提示文字"

Write-Host ""
Write-Host "執行 product tests"
& npm.cmd run test:product
if ($LASTEXITCODE -ne 0) {
    throw "product tests 仍未通過。"
}

Write-Host ""
Write-Host "執行完整驗證"
& npm.cmd run validate
if ($LASTEXITCODE -ne 0) {
    throw "完整驗證仍未通過，請先不要 commit。"
}

Write-Host ""
Write-Host "全部測試與 build 已通過。"
Write-Host "請執行：git status --short"
