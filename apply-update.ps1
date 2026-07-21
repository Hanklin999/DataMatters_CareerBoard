param(
  [Parameter(Mandatory=$true)]
  [string]$RepoPath
)

$ErrorActionPreference = "Stop"
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoPath = (Resolve-Path $RepoPath).Path

$Files = @(
  "analytics-events.js",
  "analytics.js",
  "app.js",
  "product-v3.js",
  "community.js",
  "index.html",
  "package.json",
  "package-lock.json",
  "test-analytics.mjs",
  ".github/workflows/validate.yml",
  "scripts/build.mjs",
  "scripts/static-lint.mjs",
  "scripts/generate-analytics-event-constraint.mjs",
  "tests/analytics-event-contract.test.mjs",
  "tests/analytics-url-runtime.test.mjs",
  "tests/product-v3.test.mjs",
  "tests/role-detail-runtime.test.mjs",
  "docs/ANALYTICS_DATA_DICTIONARY.md",
  "supabase/generated/analytics_event_constraint.sql",
  "supabase/generated/check_legacy_analytics_events.sql",
  "supabase/migrations/006_sync_analytics_event_names.sql"
)

$BackupRoot = Join-Path $RepoPath (".analytics-event-registry-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null

foreach ($RelativePath in $Files) {
  $Source = Join-Path $PackageRoot $RelativePath
  if (-not (Test-Path $Source)) { throw "Package file missing: $RelativePath" }

  $Target = Join-Path $RepoPath $RelativePath
  if (Test-Path $Target) {
    $Backup = Join-Path $BackupRoot $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Backup) | Out-Null
    Copy-Item -Force $Target $Backup
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Target) | Out-Null
  Copy-Item -Force $Source $Target
}

Write-Host "Analytics event registry update applied."
Write-Host "Backup: $BackupRoot"
Write-Host "Next: npm install; npm run generate:analytics-schema; npm run validate; npm run build"
