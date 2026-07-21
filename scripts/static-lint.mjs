import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const jsFiles = [
  "analytics-events.js", "app.js", "analytics.js", "product-v3.js", "community.js",
  "netlify/functions/_community-utils.js", "netlify/functions/community-read.js",
  "netlify/functions/community-submit.js", "netlify/functions/community-report.js",
  "netlify/functions/community-health.js", "netlify/functions/role-share.js"
];
for (const file of jsFiles) execFileSync(process.execPath, ["--check", file], { stdio:"inherit" });

const html = readFileSync("index.html", "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, "index.html has duplicate ids");
assert.match(html, /<meta name="viewport"[^>]*width=device-width/i);
assert.match(html, /class="skip-link"/);
assert.match(html, /aria-modal="true"/);

const registryScript = html.indexOf('src="analytics-events.js');
const configScript = html.indexOf('src="analytics-config.js');
const analyticsScript = html.indexOf('src="analytics.js');
const appScript = html.indexOf('src="app.js');
const productScript = html.indexOf('src="product-v3.js');
const communityScript = html.indexOf('src="community.js');
assert.ok(registryScript >= 0, "analytics-events.js is not loaded");
assert.ok(registryScript < configScript && configScript < analyticsScript, "Analytics registry/config/client load order is invalid");
assert.ok(analyticsScript < appScript && analyticsScript < productScript && analyticsScript < communityScript, "Analytics client must load before product scripts");

const publicFiles = ["index.html","analytics-events.js","analytics-config.js","analytics.js","app.js","product-v3.js","community.js"];
for (const file of publicFiles){
  if (!existsSync(file)) continue;
  const source = readFileSync(file,"utf8");
  assert.ok(!/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+/i.test(source), `${file} may expose a service role key`);
}
console.log(`Static lint passed: ${jsFiles.length} JavaScript files, ${ids.length} unique HTML ids.`);
