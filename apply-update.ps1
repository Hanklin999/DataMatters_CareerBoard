param(
  [Parameter(Mandatory = $true)]
  [string]$RepoPath
)

$ErrorActionPreference = "Stop"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = (Resolve-Path $RepoPath).Path

$required = @(
  (Join-Path $Repo ".git"),
  (Join-Path $Repo "analytics-config.js"),
  (Join-Path $Repo "data\careers.json"),
  (Join-Path $Repo "images")
)
foreach ($item in $required) {
  if (-not (Test-Path $item)) {
    throw "不是完整的 Data Matters repository，缺少：$item"
  }
}

$excluded = @(
  "APPLY_UPDATE.md",
  "CHANGE_REPORT.md",
  "VALIDATION_REPORT.md",
  "apply-update.ps1"
)

$files = Get-ChildItem -LiteralPath $Source -Recurse -File | Where-Object {
  $relative = $_.FullName.Substring($Source.Length).TrimStart('\')
  $excluded -notcontains $relative
}

foreach ($file in $files) {
  $relative = $file.FullName.Substring($Source.Length).TrimStart('\')
  $destination = Join-Path $Repo $relative
  $parent = Split-Path -Parent $destination
  if (-not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  Copy-Item -LiteralPath $file.FullName -Destination $destination -Force
  Write-Host "Updated $relative"
}

Write-Host ""
Write-Host "完成。已保留 analytics-config.js、data、images 與 .git。" -ForegroundColor Green
Write-Host "下一步：cd 到 repository，執行 npm run validate。"
