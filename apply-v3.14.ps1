$ErrorActionPreference = "Stop"

$required = @(
  ".\app.v3.14.js",
  ".\test-cases.v3.14.mjs",
  ".\v3.14-scoring-audit.mjs",
  ".\app.js",
  ".\test-cases.mjs",
  ".\scripts\build.mjs"
)
foreach ($path in $required) {
  if (-not (Test-Path $path)) { throw "找不到 $path。請把 v3.14 bundle 的檔案放在 Repo 根目錄後再執行。" }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = ".\backup-v3.14-$stamp"
New-Item -ItemType Directory -Force $backup | Out-Null
Copy-Item .\app.js "$backup\app.js"
Copy-Item .\test-cases.mjs "$backup\test-cases.mjs"
Copy-Item .\scripts\build.mjs "$backup\build.mjs"
if (Test-Path .\analytics-config.js) { Copy-Item .\analytics-config.js "$backup\analytics-config.js" }
if (Test-Path .\index.html) { Copy-Item .\index.html "$backup\index.html" }
Write-Host "已備份到 $backup"

Copy-Item .\app.v3.14.js .\app.js -Force
Copy-Item .\test-cases.v3.14.mjs .\test-cases.mjs -Force
Write-Host "已替換 app.js 與 test-cases.mjs"

function Replace-RequiredRegex {
  param([string]$Path, [string]$Pattern, [string]$Replacement, [string]$Label)
  $content = Get-Content $Path -Raw -Encoding UTF8
  $updated = [regex]::Replace($content, $Pattern, $Replacement)
  if ($updated -eq $content) {
    if ($content -match [regex]::Escape($Replacement)) {
      Write-Host "略過：$Label 已是新版"
      return
    }
    throw "找不到要更新的內容：$Label ($Path)"
  }
  Set-Content $Path $updated -Encoding UTF8
  Write-Host "已更新：$Label"
}

Replace-RequiredRegex ".\scripts\build.mjs" 'APP_VERSION:\s*"v[^"]+"' 'APP_VERSION: "v3.14"' "production app version"
Replace-RequiredRegex ".\scripts\build.mjs" 'SCORING_VERSION:\s*"[^"]+"' 'SCORING_VERSION: "v3.14-calibrated"' "production scoring version"

if (Test-Path .\analytics-config.js) {
  $cfg = Get-Content .\analytics-config.js -Raw -Encoding UTF8
  $newCfg = [regex]::Replace($cfg, 'APP_VERSION:\s*"v[^"]+"', 'APP_VERSION: "v3.14"')
  $newCfg = [regex]::Replace($newCfg, 'SCORING_VERSION:\s*"[^"]+"', 'SCORING_VERSION: "v3.14-calibrated"')
  if ($newCfg -ne $cfg) {
    Set-Content .\analytics-config.js $newCfg -Encoding UTF8
    Write-Host "已更新：analytics-config.js 版本欄位（未改 Supabase URL/key）"
  }
}

if (Test-Path .\index.html) {
  $html = Get-Content .\index.html -Raw -Encoding UTF8
  $newHtml = [regex]::Replace($html, 'app\.js\?v=[^"'']+', 'app.js?v=3.14')
  if ($newHtml -ne $html) {
    Set-Content .\index.html $newHtml -Encoding UTF8
    Write-Host "已更新：index.html app.js cache busting"
  }
}

Write-Host ""
Write-Host "執行獨立 scoring audit"
& node .\v3.14-scoring-audit.mjs
if ($LASTEXITCODE -ne 0) { throw "v3.14 scoring audit 未通過。" }

Write-Host ""
Write-Host "執行完整驗證"
& npm.cmd run validate
if ($LASTEXITCODE -ne 0) {
  throw "完整驗證未通過。已保留備份：$backup"
}

Write-Host ""
Write-Host "v3.14 已套用，完整驗證通過。"
Write-Host "下一步：git status --short"
