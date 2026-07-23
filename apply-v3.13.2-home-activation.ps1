$ErrorActionPreference = "Stop"

$repo = Get-Location
$indexPath = Join-Path $repo "index.html"
$cssPath = Join-Path $repo "product-v3.css"

if (-not (Test-Path $indexPath)) {
    throw "找不到 index.html。請先 cd 到 DataMatters_CareerBoard Repo 根目錄。"
}

if (-not (Test-Path $cssPath)) {
    throw "找不到 product-v3.css。請先 cd 到 DataMatters_CareerBoard Repo 根目錄。"
}

$index = Get-Content $indexPath -Raw -Encoding UTF8

$oldBlock = @'
      <div class="home-hero-copy">
        <div class="eyebrow">給第一次探索資料工作的你</div>
        <h1 id="home-title">找出適合你的資料職涯</h1>
        <p class="hero-sub">用幾個生活問題，了解你適合探索哪些資料工作。</p>
      </div>

      <div id="home-card-fan" class="home-card-fan" aria-label="隨機排列的資料職涯角色卡" aria-live="polite">
        <div class="home-card-fan-placeholder" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <p class="home-card-fan-hint">每次打開都會遇見不同角色。點一張卡，開始找出你的資料職涯。</p>

      <div class="cta-row home-hero-actions">
        <button class="btn btn-primary" onclick="Nav.startQuiz('landing_hero')">翻開我的職涯角色</button>
        <button class="btn btn-ghost" onclick="Nav.show('encyclopedia')">先看九大職涯</button>
      </div>

      <div class="home-outcomes" aria-label="你會得到">
        <span>適合你的職涯角色</span><span>可能做的真實工作</span><span>建議技能與下一步</span>
      </div>

      <p class="privacy-inline">測驗不需要姓名或 Email；網站會匿名記錄基本操作，用於改善使用體驗。</p>
'@

$newBlock = @'
      <div class="home-hero-copy">
        <div class="eyebrow">給第一次探索資料工作的你</div>
        <h1 id="home-title">用 3 分鐘，找到值得你探索的資料職涯</h1>
        <p class="hero-sub">回答幾個生活情境題，看看哪種資料工作更符合你喜歡的做事方式。</p>
      </div>

      <div class="home-outcomes" aria-label="完成測驗後你會得到">
        <span>一個主要方向</span>
        <span>相近角色比較</span>
        <span>真實工作與下一步</span>
      </div>

      <div class="cta-row home-hero-actions">
        <button class="btn btn-primary" onclick="Nav.startQuiz('landing_hero')">開始 3 分鐘職涯測驗</button>
        <button class="btn btn-ghost home-secondary-cta" onclick="Nav.show('encyclopedia')">先看看 9 種資料工作</button>
      </div>

      <p class="home-cta-trust">不用登入｜不是能力測驗｜可以隨時重新探索</p>

      <div id="home-card-fan" class="home-card-fan" aria-label="隨機排列的資料職涯角色卡" aria-live="polite">
        <div class="home-card-fan-placeholder" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
      <p class="home-card-fan-hint">點任一張卡也能開始測驗，選哪張都不會影響配對結果。</p>

      <p class="privacy-inline">網站只匿名記錄基本操作，用於改善體驗；不收集姓名、Email 或完整作答內容。</p>
'@

if ($index.Contains($newBlock)) {
    Write-Host "首頁 HTML 已是 v3.13.2 版本，略過內容替換。"
} elseif ($index.Contains($oldBlock)) {
    $index = $index.Replace($oldBlock, $newBlock)
} else {
    throw "找不到預期的 v3.13.1 首頁區塊。Repo 可能又更新過，請勿強制套用。"
}

$index = $index.Replace('product-v3.css?v=3.13.1', 'product-v3.css?v=3.13.2')
$index = $index.Replace('window.DATA_MATTERS_APP_VERSION = "v3.13.1"', 'window.DATA_MATTERS_APP_VERSION = "v3.13.2"')
$index = $index.Replace('app.js?v=3.13.1', 'app.js?v=3.13.2')
$index = $index.Replace('product-v3.js?v=3.13.1', 'product-v3.js?v=3.13.2')

Set-Content $indexPath $index -Encoding UTF8

$css = Get-Content $cssPath -Raw -Encoding UTF8
$marker = "v3.13.2 — Homepage activation and CTA clarity"

if ($css.Contains($marker)) {
    Write-Host "v3.13.2 CSS 已存在，略過附加。"
} else {
    $cssPatch = @'

/* ==========================================================================
   v3.13.2 — Homepage activation and CTA clarity
   Keep the primary action visible before the decorative card fan,
   clarify expected effort and output, and reduce secondary CTA emphasis.
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
  text-decoration-color:color-mix(in srgb,var(--sub) 48%,transparent);
  text-underline-offset:4px;
}

.home-secondary-cta:hover,
.home-secondary-cta:focus-visible{
  color:var(--text)!important;
  text-decoration-color:currentColor;
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

#home-card-fan.home-card-fan{
  margin-top:20px;
}

.home-card-fan-hint{
  max-width:620px;
  line-height:1.55;
}

@media(max-width:600px){
  .home-hero h1{
    max-width:360px;
    font-size:clamp(1.9rem,9vw,2.55rem);
    line-height:1.14;
  }

  .home-hero .hero-sub{
    max-width:340px;
    margin-inline:auto;
    line-height:1.65;
  }

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
    text-align:center;
  }

  .home-hero-actions{
    display:grid;
    grid-template-columns:1fr;
    width:100%;
    gap:4px;
  }

  .home-hero-actions .btn{
    width:100%;
  }

  .home-hero-actions .btn-primary{
    min-width:0;
    min-height:50px;
    font-size:16px;
  }

  .home-secondary-cta{
    min-height:40px!important;
    padding-block:6px!important;
  }

  .home-cta-trust{
    margin-top:8px;
    padding-inline:8px;
    font-size:11px;
  }

  #home-card-fan.home-card-fan{
    margin-top:8px!important;
  }

  .home-card-fan-hint{
    max-width:330px;
    padding-inline:8px;
  }
}

'@
    Add-Content $cssPath $cssPatch -Encoding UTF8
}

Write-Host ""
Write-Host "完成：Data Matters v3.13.2 首頁啟動優化"
Write-Host "修改檔案：index.html、product-v3.css"
Write-Host ""
Write-Host "下一步："
Write-Host "npm run validate"
Write-Host "git diff -- index.html product-v3.css"
Write-Host 'git add index.html product-v3.css'
Write-Host 'git commit -m "Improve homepage activation and CTA clarity"'
Write-Host "git push"
