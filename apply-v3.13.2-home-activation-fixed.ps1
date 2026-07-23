$ErrorActionPreference = "Stop"

$root = Get-Location
$indexPath = Join-Path $root "index.html"
$cssPath = Join-Path $root "product-v3.css"

if (-not (Test-Path $indexPath)) { throw "找不到 index.html。請在 Repo 根目錄執行。" }
if (-not (Test-Path $cssPath)) { throw "找不到 product-v3.css。請在 Repo 根目錄執行。" }

$index = Get-Content $indexPath -Raw -Encoding UTF8

if ($index -match 'DATA_MATTERS_APP_VERSION\s*=\s*"v3\.13\.2"' -or
    $index -match 'DATA_MATTERS_APP_VERSION\s*=\s*"v3\.13\.3"') {
    Write-Host "首頁版本已高於 v3.13.1，略過 v3.13.2。"
    exit 0
}

if ($index -notmatch 'DATA_MATTERS_APP_VERSION\s*=\s*"v3\.13\.1"') {
    throw "無法確認目前為 v3.13.1，停止套用。"
}

function Replace-Required([string]$Text, [string]$Pattern, [string]$Replacement, [string]$Label) {
    $updated = [regex]::Replace(
        $Text,
        $Pattern,
        $Replacement,
        [System.Text.RegularExpressions.RegexOptions]::Singleline
    )
    if ($updated -eq $Text) {
        throw "找不到可修改內容：$Label"
    }
    return $updated
}

# 1) 更新首頁主標與副標
$index = Replace-Required $index `
    '<h1 id="home-title">.*?</h1>' `
    '<h1 id="home-title">用 3 分鐘，找到值得你探索的資料職涯</h1>' `
    '首頁主標'

$index = Replace-Required $index `
    '<p class="hero-sub">.*?</p>' `
    '<p class="hero-sub">回答幾個生活情境題，看看哪種資料工作更符合你喜歡的做事方式。</p>' `
    '首頁副標'

# 2) 抓出卡牌、CTA、結果價值與隱私區塊
$cardPattern = '(?s)(<div id="home-card-fan".*?</div>\s*<p class="home-card-fan-hint">.*?</p>)'
$ctaPattern = '(?s)(<div class="cta-row home-hero-actions">.*?</div>)'
$outcomesPattern = '(?s)(<div class="home-outcomes".*?</div>)'
$privacyPattern = '(?s)(<p class="privacy-inline">.*?</p>)'

$cardMatch = [regex]::Match($index, $cardPattern)
$ctaMatch = [regex]::Match($index, $ctaPattern)
$outcomesMatch = [regex]::Match($index, $outcomesPattern)
$privacyMatch = [regex]::Match($index, $privacyPattern)

if (-not $cardMatch.Success) { throw "找不到首頁卡牌區塊。" }
if (-not $ctaMatch.Success) { throw "找不到首頁 CTA 區塊。" }
if (-not $outcomesMatch.Success) { throw "找不到首頁結果價值區塊。" }
if (-not $privacyMatch.Success) { throw "找不到首頁隱私說明。" }

$newOutcomes = @'
<div class="home-outcomes" aria-label="完成測驗後你會得到">
        <span>一個主要方向</span>
        <span>相近角色比較</span>
        <span>真實工作與下一步</span>
      </div>
'@

$newCta = @'
<div class="cta-row home-hero-actions">
        <button class="btn btn-primary" onclick="Nav.startQuiz('landing_hero')">開始 3 分鐘職涯測驗</button>
        <button class="btn btn-ghost home-secondary-cta" onclick="Nav.show('encyclopedia')">先看看 9 種資料工作</button>
      </div>

      <p class="home-cta-trust">不用登入｜不是能力測驗｜可以隨時重新探索</p>
'@

$newCard = [regex]::Replace(
    $cardMatch.Value,
    '<p class="home-card-fan-hint">.*?</p>',
    '<p class="home-card-fan-hint">點任一張卡也能開始測驗，選哪張都不會影響推薦結果。</p>',
    [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$newPrivacy = '<p class="privacy-inline">網站只匿名記錄基本操作，用於改善體驗；不收集姓名、Email 或完整作答內容。</p>'

# 刪除舊區塊後，在 card fan 原位置重組順序
$anchor = $cardMatch.Index
$blocks = @($cardMatch, $ctaMatch, $outcomesMatch, $privacyMatch) | Sort-Object Index -Descending
foreach ($m in $blocks) {
    $index = $index.Remove($m.Index, $m.Length)
}

$replacement = @"
      $newOutcomes

      $newCta

      $newCard

      $newPrivacy
"@
$index = $index.Insert($anchor, $replacement)

# 3) 版本字串
$index = $index -replace 'product-v3\.css\?v=3\.13\.1', 'product-v3.css?v=3.13.2'
$index = $index -replace 'DATA_MATTERS_APP_VERSION\s*=\s*"v3\.13\.1"', 'DATA_MATTERS_APP_VERSION = "v3.13.2"'
$index = $index -replace 'app\.js\?v=3\.13\.1', 'app.js?v=3.13.2'
$index = $index -replace 'product-v3\.js\?v=3\.13\.1', 'product-v3.js?v=3.13.2'

Set-Content $indexPath $index -Encoding UTF8

$css = Get-Content $cssPath -Raw -Encoding UTF8
$marker = "v3.13.2 — Homepage activation and CTA clarity"
if (-not $css.Contains($marker)) {
$cssPatch = @'

/* ==========================================================================
   v3.13.2 — Homepage activation and CTA clarity
   ========================================================================== */

.home-hero .home-outcomes{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  width:min(100%,720px);
  gap:8px;
  margin:22px auto 18px;
}

.home-hero .home-outcomes span{
  display:flex;
  align-items:center;
  justify-content:center;
  min-height:42px;
  padding:8px 10px;
  text-align:center;
  line-height:1.35;
}

.home-hero-actions{
  justify-content:center;
  align-items:center;
  gap:10px;
  margin:0 auto;
}

.home-hero-actions .btn-primary{
  min-width:240px;
  font-weight:800;
  box-shadow:0 14px 34px color-mix(in srgb,var(--accent) 26%,transparent);
}

.home-secondary-cta{
  border-color:transparent!important;
  background:transparent!important;
  box-shadow:none!important;
  color:var(--sub)!important;
  text-decoration:underline;
  text-underline-offset:4px;
}

.home-cta-trust{
  position:relative;
  z-index:4;
  max-width:680px;
  margin:12px auto 0;
  color:var(--sub);
  font-size:12px;
  line-height:1.6;
  text-align:center;
}

#home-card-fan.home-card-fan{ margin-top:20px; }

@media(max-width:600px){
  .home-hero .home-outcomes{
    grid-template-columns:repeat(3,minmax(0,1fr));
    gap:6px;
    margin:18px auto 14px;
  }

  .home-hero .home-outcomes span{
    width:auto;
    min-width:0;
    min-height:52px;
    padding:7px 5px;
    font-size:11px;
  }

  .home-hero-actions{
    display:grid;
    grid-template-columns:1fr;
    width:100%;
    gap:4px;
  }

  .home-hero-actions .btn{ width:100%; }

  .home-hero-actions .btn-primary{
    min-width:0;
    min-height:50px;
    font-size:16px;
  }

  .home-secondary-cta{
    min-height:40px!important;
    padding-block:6px!important;
  }

  #home-card-fan.home-card-fan{
    margin-top:8px!important;
  }
}
'@
    Add-Content $cssPath $cssPatch -Encoding UTF8
}

Write-Host "v3.13.2 套用完成。"
exit 0
