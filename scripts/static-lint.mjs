import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const jsFiles = [
  "app.js", "analytics.js", "product-v3.js", "community.js",
  "netlify/functions/_community-utils.js", "netlify/functions/community-read.js",
  "netlify/functions/community-submit.js", "netlify/functions/community-report.js"
];
for (const file of jsFiles) execFileSync(process.execPath, ["--check", file], { stdio:"inherit" });

const html = readFileSync("index.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, "index.html has duplicate ids");
assert.match(html, /<meta name="viewport"[^>]*width=device-width/i);
assert.match(html, /class="skip-link"/);
assert.match(html, /aria-modal="true"/);

const publicFiles = ["index.html","analytics-config.js","analytics.js","app.js","product-v3.js","community.js"];
for (const file of publicFiles){
  const source = readFileSync(file,"utf8");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i.test(source), `${file} may expose a service role key`);
}
const config = readFileSync("analytics-config.js","utf8");
assert.ok(!/eyJ[a-zA-Z0-9_-]{20,}\./.test(config), "analytics-config.js contains a committed JWT-like key");
console.log(`Static lint passed: ${jsFiles.length} JavaScript files, ${ids.length} unique HTML ids.`);
