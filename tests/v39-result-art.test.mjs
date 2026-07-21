import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync("product-v3.css","utf8");
const heroRules=[...css.matchAll(/(?:#result-hero[^{}]*|\.result-hero-art[^{}]*)\.square-portrait img\s*\{([^{}]*)\}/g)].map(m=>m[1]);

test("result hero never restores contain letterboxing",()=>{
  assert.ok(heroRules.length>=1,"missing result hero image rules");
  assert.equal(heroRules.some(rule=>/object-fit\s*:\s*contain/i.test(rule)),false);
});

test("final result hero image rule fills and centers the square",()=>{
  const finalRule=heroRules.at(-1);
  assert.match(finalRule,/width\s*:\s*100%\s*!important/);
  assert.match(finalRule,/height\s*:\s*100%\s*!important/);
  assert.match(finalRule,/object-fit\s*:\s*cover\s*!important/);
  assert.match(finalRule,/object-position\s*:\s*center center\s*!important/);
  assert.match(finalRule,/margin\s*:\s*0\s*!important/);
});

test("result portrait frame clips overflow at a 1:1 ratio",()=>{
  assert.match(css,/#result-hero button\.result-hero-art \.square-portrait\{[\s\S]*?aspect-ratio:1\/1!important[\s\S]*?overflow:hidden!important/);
});
