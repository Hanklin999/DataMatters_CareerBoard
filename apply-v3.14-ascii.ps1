$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host ("==> " + $Message)
}

function Read-Utf8File {
    param([string]$Path)
    return [System.IO.File]::ReadAllText((Resolve-Path $Path))
}

function Write-Utf8File {
    param(
        [string]$Path,
        [string]$Content
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $Path), $Content, $utf8NoBom)
}

function Replace-Required {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Replacement,
        [string]$Label
    )

    $content = Read-Utf8File $Path
    $updated = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        $Pattern,
        $Replacement
    )

    if ($updated -eq $content) {
        if ($content.Contains($Replacement)) {
            Write-Host ("Already current: " + $Label)
            return
        }
        throw ("Could not update " + $Label + " in " + $Path)
    }

    Write-Utf8File $Path $updated
    Write-Host ("Updated: " + $Label)
}

function Update-AnalyticsConfig {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        Write-Host "Skipped: analytics-config.js not found"
        return
    }

    $content = Read-Utf8File $Path
    $updated = $content

    if ($updated -match 'APP_VERSION\s*:') {
        $updated = [regex]::Replace(
            $updated,
            'APP_VERSION\s*:\s*["''][^"'']+["'']',
            'APP_VERSION: "v3.14"'
        )
    }
    else {
        Write-Host "Warning: APP_VERSION was not found in analytics-config.js"
    }

    if ($updated -match 'SCORING_VERSION\s*:') {
        $updated = [regex]::Replace(
            $updated,
            'SCORING_VERSION\s*:\s*["''][^"'']+["'']',
            'SCORING_VERSION: "v3.14-calibrated"'
        )
    }
    elseif ($updated -match 'APP_VERSION\s*:\s*"v3\.14"\s*,?') {
        $updated = [regex]::Replace(
            $updated,
            '(APP_VERSION\s*:\s*"v3\.14"\s*,?)',
            '$1' + [Environment]::NewLine + '  SCORING_VERSION: "v3.14-calibrated",',
            1
        )
    }
    else {
        Write-Host "Warning: SCORING_VERSION could not be inserted into analytics-config.js"
    }

    if ($updated -ne $content) {
        Write-Utf8File $Path $updated
        Write-Host "Updated: analytics-config.js version fields"
    }
    else {
        Write-Host "Already current: analytics-config.js version fields"
    }
}

$required = @(
    ".\package.json",
    ".\app.js",
    ".\test-cases.mjs",
    ".\scripts\build.mjs",
    ".\app.v3.14.js",
    ".\test-cases.v3.14.mjs",
    ".\v3.14-scoring-audit.mjs"
)

foreach ($path in $required) {
    if (-not (Test-Path $path)) {
        throw ("Missing required file: " + $path + ". Run this script from the repository root.")
    }
}

Write-Step "Create backup"

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path (Get-Location) ("backup-v3.14-" + $stamp)
New-Item -ItemType Directory -Force -Path $backup | Out-Null

Copy-Item ".\app.js" (Join-Path $backup "app.js") -Force
Copy-Item ".\test-cases.mjs" (Join-Path $backup "test-cases.mjs") -Force
Copy-Item ".\scripts\build.mjs" (Join-Path $backup "build.mjs") -Force

if (Test-Path ".\analytics-config.js") {
    Copy-Item ".\analytics-config.js" (Join-Path $backup "analytics-config.js") -Force
}
if (Test-Path ".\index.html") {
    Copy-Item ".\index.html" (Join-Path $backup "index.html") -Force
}

Write-Host ("Backup created: " + $backup)

Write-Step "Install v3.14 questionnaire and matching tests"

Copy-Item ".\app.v3.14.js" ".\app.js" -Force
Copy-Item ".\test-cases.v3.14.mjs" ".\test-cases.mjs" -Force

Write-Host "Replaced: app.js"
Write-Host "Replaced: test-cases.mjs"

Write-Step "Update production version fields"

Replace-Required `
    ".\scripts\build.mjs" `
    'APP_VERSION\s*:\s*["''][^"'']+["'']' `
    'APP_VERSION: "v3.14"' `
    "build APP_VERSION"

Replace-Required `
    ".\scripts\build.mjs" `
    'SCORING_VERSION\s*:\s*["''][^"'']+["'']' `
    'SCORING_VERSION: "v3.14-calibrated"' `
    "build SCORING_VERSION"

Update-AnalyticsConfig ".\analytics-config.js"

if (Test-Path ".\index.html") {
    $html = Read-Utf8File ".\index.html"
    $newHtml = [regex]::Replace(
        $html,
        'app\.js\?v=[^"''\s>]+',
        'app.js?v=3.14'
    )

    if ($newHtml -ne $html) {
        Write-Utf8File ".\index.html" $newHtml
        Write-Host "Updated: index.html app.js cache version"
    }
    else {
        Write-Host "Skipped: no app.js cache version needed updating"
    }
}

Write-Step "Run syntax checks"

& node --check ".\app.js"
if ($LASTEXITCODE -ne 0) {
    throw ("app.js syntax check failed. Backup: " + $backup)
}

& node --check ".\test-cases.mjs"
if ($LASTEXITCODE -ne 0) {
    throw ("test-cases.mjs syntax check failed. Backup: " + $backup)
}

& node --check ".\v3.14-scoring-audit.mjs"
if ($LASTEXITCODE -ne 0) {
    throw ("scoring audit syntax check failed. Backup: " + $backup)
}

Write-Step "Run v3.14 scoring audit"

& node ".\v3.14-scoring-audit.mjs"
if ($LASTEXITCODE -ne 0) {
    throw ("v3.14 scoring audit failed. Backup: " + $backup)
}

Write-Step "Run full repository validation"

& npm.cmd run validate
if ($LASTEXITCODE -ne 0) {
    throw ("Full validation failed. Backup: " + $backup)
}

Write-Step "Completed"

Write-Host "v3.14 was applied successfully."
Write-Host "Scoring version: v3.14-calibrated"
Write-Host "Next command: git status --short"
