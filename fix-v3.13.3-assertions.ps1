$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "test-cases.mjs"
if (-not (Test-Path $path)) {
    throw "找不到 test-cases.mjs。請在 Repo 根目錄執行。"
}

$content = Get-Content $path -Raw -Encoding UTF8
$before = $content

function Replace-AssertionLine {
    param(
        [string]$LabelPattern,
        [string]$Replacement,
        [string]$Description
    )

    $pattern = '(?m)^[ \t]*check\("' + $LabelPattern + '".*?\);[ \t]*$'
    $matches = [regex]::Matches($script:content, $pattern)

    if ($matches.Count -eq 0) {
        Write-Host "找不到：$Description"
        return
    }

    if ($matches.Count -gt 1) {
        throw "找到超過一行符合「$Description」，停止避免誤改。"
    }

    $indent = ([regex]::Match($matches[0].Value, '^[ \t]*')).Value
    $script:content = [regex]::Replace(
        $script:content,
        $pattern,
        $indent + $Replacement
    )
    Write-Host "已更新：$Description"
}

Replace-AssertionLine `
    '環境摘要包含[^"]*' `
    'check("環境摘要包含收入／公司名氣／工作節奏", envL.includes("收入") && envL.includes("公司名氣") && envL.includes("較快、較忙"));' `
    '環境摘要 assertion'

Replace-AssertionLine `
    '挑戰路線詳細含[^"]*' `
    'check("挑戰路線詳細含起點與補強區塊", detail.includes("你目前的起點與可補強項目"));' `
    '挑戰路線詳細 assertion'

Replace-AssertionLine `
    '結果頁詳細含三區塊[^"]*' `
    'check("結果頁詳細含三區塊（推薦／起點補強／環境可省略）", h1.includes("為什麼推薦這個方向") && h1.includes("你目前的起點與可補強項目"));' `
    '結果頁三區塊 assertion'

if ($content -eq $before) {
    throw "沒有修改任何 assertion。請先執行下方 Select-String 指令並貼出結果。"
}

Set-Content $path $content -Encoding UTF8

Write-Host ""
Write-Host "先執行 matching 測試"
& npm.cmd run test:matching
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "請貼出以下指令結果："
    Write-Host 'Select-String -Path .\test-cases.mjs -Pattern "環境摘要包含|挑戰路線詳細含|結果頁詳細含三區塊" -Context 0,1'
    throw "matching 測試仍未通過。"
}

Write-Host ""
Write-Host "matching 測試通過，執行完整驗證"
& npm.cmd run validate
if ($LASTEXITCODE -ne 0) {
    throw "完整驗證失敗，請先不要 commit。"
}

Write-Host ""
Write-Host "全部驗證通過。"
Write-Host "請檢查：git status --short"
