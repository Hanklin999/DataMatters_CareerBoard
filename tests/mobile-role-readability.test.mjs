import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const product = fs.readFileSync(path.join(root, "product-v3.js"), "utf8");
const css = fs.readFileSync(path.join(root, "product-v3.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("角色詳情使用技術深度文字且不再顯示星星", () => {
  assert.match(app, /技術深度：\$\{p\.tlevel_range/);
  assert.match(app, /需要 Python、統計建模與解釋模型結果的能力/);
  assert.doesNotMatch(app, /"★"\.repeat\(p\.technical_stars\)/);
  assert.match(app, /class="tech-depth-summary"/);
});

test("角色詳情首段改成一句話看懂", () => {
  assert.match(app, /一句話看懂/);
  assert.match(app, /p\.tagline \|\| p\.role_description/);
});

test("手機工作重心圖使用全寬版面與短角色名稱", () => {
  assert.match(html, /class="focus-mobile-y-guide"/);
  assert.match(html, /← 找答案/);
  assert.match(html, /做出工具 →/);
  assert.match(product, /const MAP_SHORT_LABELS/);
  assert.match(product, /class="map-label-short"/);
  assert.match(css, /\.focus-y-axis\{display:none!important\}/);
  assert.match(css, /\.map-label-full\{display:none!important\}/);
  assert.match(css, /\.map-label-short\{display:block!important\}/);
  assert.match(css, /height:min\(118vw,450px\)!important/);
});
