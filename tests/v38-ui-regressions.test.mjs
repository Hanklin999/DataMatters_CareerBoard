import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync("index.html","utf8");
const css=readFileSync("product-v3.css","utf8");

test("mobile result artwork has one final centered container",()=>{
  assert.match(css,/#result-hero button\.result-hero-art\{[\s\S]*width:min\(100%,340px\)!important[\s\S]*justify-self:center!important/);
  assert.match(css,/object-position:center center!important/);
  assert.match(css,/grid-template-areas:"heading" "art" "body"!important/);
});

test("about page contains Hank contact links and JC credit",()=>{
  assert.match(html,/我是 Hank/);
  assert.match(html,/https:\/\/threads\.com\/@hank00117/);
  assert.match(html,/mailto:data\.matters\.hank4@gmail\.com/);
  assert.match(html,/感謝 JC 提供金融版本的構想與交流/);
  assert.match(html,/https:\/\/www\.threads\.com\/@g_c088\//);
  assert.match(html,/https:\/\/gc-good-career\.netlify\.app\//);
});
