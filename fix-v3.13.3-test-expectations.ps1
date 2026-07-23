$ErrorActionPreference = "Stop"

$path = Join-Path (Get-Location) "test-cases.mjs"
if (-not (Test-Path $path)) {
    throw "找不到 test-cases.mjs。請在 DataMatters_CareerBoard Repo 根目錄執行。"
}

$content = Get-Content $path -Raw -Encoding UTF8
$original = $content

$replacements = @(
    @("收入高上限", "更高的收入機會"),
    @("品牌與頭銜", "公司名氣與職稱"),
    @("高壓", "較快、較忙"),
    @("你的入門優勢與差距", "你目前的起點與可補強項目"),
    @("為什麼推薦這條路線", "為什麼推薦這個方向")
)

foreach ($pair in $replacements) {
    $old = $pair[0]
    $new = $pair[1]

    if ($content.Contains($old)) {
        $content = $content.Replace($old, $new)
        Write-Host "更新測試文字：$old -> $new"
    }
    elseif ($content.Contains($new)) {
        Write-Host "略過：已使用新版文字「$new」"
    }
    else {
        Write-Host "未找到：$old（可能該測試使用其他寫法）"
    }
}

if ($content -ne $original) {
    Set-Content $path $content -Encoding UTF8
    Write-Host ""
    Write-Host "已更新 test-cases.mjs"
}
else {
    Write-Host ""
    Write-Host "test-cases.mjs 沒有需要寫入的變更。"
}

Write-Host ""
Write-Host "執行 matching 測試"
& npm.cmd run test:matching
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "matching 測試仍失敗。請執行："
    Write-Host 'Select-String -Path .\test-cases.mjs -Pattern "環境摘要|入門優勢|三區塊|高薪|名聲|高壓" -Context 4,8'
    throw "matching 測試仍未通過。"
}

Write-Host ""
Write-Host "執行完整驗證"
& npm.cmd run validate
if ($LASTEXITCODE -ne 0) {
    throw "完整驗證失敗，請先不要 commit。"
}

Write-Host ""
Write-Host "修正完成。請檢查："
Write-Host "git status --short"
Write-Host "git diff -- test-cases.mjs"
Write-Host ""
Write-Host "最終應提交網站六個檔案，加上同步更新的測試檔："
Write-Host "index.html"
Write-Host "product-v3.css"
Write-Host "app.js"
Write-Host "product-v3.js"
Write-Host "community.js"
Write-Host "data/careers.json"
Write-Host "test-cases.mjs"
