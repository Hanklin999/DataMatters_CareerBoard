import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "product-v3.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

function homeFanSource() {
  const start = app.indexOf("const HomeCardFan = {");
  const end = app.indexOf("// Inline handlers", start);
  assert.notEqual(start, -1, "HomeCardFan must exist");
  assert.notEqual(end, -1, "HomeCardFan block must have a stable boundary");
  return app.slice(start, end);
}

test("首頁包含卡牌扇形入口與新版 cache busting", () => {
  assert.match(html, /id="home-card-fan"/);
  assert.match(html, /點任一張卡也能開始測驗，選哪張都不會影響推薦結果。/);
  assert.match(html, /開始 3 分鐘職涯測驗/);
  assert.match(html, /id="home-card-fan-critical"/);
  assert.match(html, /product-v3\.css\?v=3\.13\.3/);
  assert.match(html, /app\.js\?v=3\.13\.3/);
});

test("卡牌順序使用 Fisher-Yates 隨機化且優先使用 Web Crypto", () => {
  const source = homeFanSource();
  assert.match(source, /window\.crypto\.getRandomValues/);
  assert.match(source, /for \(let i = result\.length - 1; i > 0; i -= 1\)/);
  assert.match(source, /\[result\[i\], result\[j\]\] = \[result\[j\], result\[i\]\]/);
  assert.match(app, /HomeCardFan\.render\(\);/);
});

test("首頁只使用卡背，不再把角色原圖放大成單張 Hero", () => {
  const source = homeFanSource();
  assert.match(source, /home-role-card-back/);
  assert.doesNotMatch(source, /createElement\("img"\)/);
  assert.doesNotMatch(source, /profile\.card_image/);
  assert.match(css, /#home-card-fan button\.home-role-card\{[\s\S]*all:unset!important/);
});

test("桌面九張、平板五張、手機三張由 JS 明確配置", () => {
  const source = homeFanSource();
  assert.match(source, /if \(width <= 480\)/);
  assert.match(source, /if \(width <= 800\)/);
  assert.match(source, /x: -320/);
  assert.match(source, /x: -148/);
  assert.match(source, /x: -72/);
  assert.match(source, /card\.hidden = !visible/);
  assert.match(source, /--fan-x/);
  assert.match(source, /--fan-rotation/);
});

test("每張可見卡片都是測驗入口且不改推薦分數", () => {
  const source = homeFanSource();
  assert.match(source, /card\.addEventListener\("click", \(\) => this\.pick\(card\)\)/);
  assert.match(source, /Nav\.startQuiz\("landing_card_fan"\)/);
  assert.doesNotMatch(source, /preferenceScores|backgroundScores|environmentScores|addPref|addContrib/);
});

test("卡牌 CSS 以高 specificity reset，避免全站 button 或 img 樣式污染", () => {
  assert.match(css, /#home-card-fan button\.home-role-card/);
  assert.match(css, /all:unset!important/);
  assert.match(css, /position:absolute!important/);
  assert.match(css, /aspect-ratio:2\/3!important/);
  assert.match(css, /@media\(max-width:800px\)/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});


test("手機版文字與卡牌使用不同堆疊層，卡牌被限制在自己的舞台內", () => {
  assert.match(html, /class="home-hero-copy"/);
  assert.match(css, /\.home-hero-copy\{[\s\S]*z-index:3/);
  assert.match(css, /@media\(max-width:800px\)\{[\s\S]*#home-card-fan\.home-card-fan\{[\s\S]*overflow:hidden!important/);
  assert.match(css, /contain:layout paint!important/);
  assert.match(css, /\.home-card-fan-hint,[\s\S]*\.privacy-inline\{[\s\S]*z-index:4/);
});

test("手機卡牌配置不再使用負向 Y 位移，避免覆蓋標題或下方文字", () => {
  const source = homeFanSource();
  const mobileStart = source.indexOf("if (width <= 480)");
  const tabletStart = source.indexOf("if (width <= 800)", mobileStart);
  const mobileBlock = source.slice(mobileStart, tabletStart);
  assert.doesNotMatch(mobileBlock, /y:\s*-/);
  assert.match(mobileBlock, /y: 0/);
  assert.match(css, /height:320px!important/);
  assert.match(css, /bottom:24px!important/);
});

