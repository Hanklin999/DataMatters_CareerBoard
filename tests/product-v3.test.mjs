import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync("app.js","utf8");
const product = readFileSync("product-v3.js","utf8");
const community = readFileSync("community.js","utf8");
const html = readFileSync("index.html","utf8");
const css = readFileSync("product-v3.css","utf8");
const sql = readFileSync("supabase/migrations/002_community_board.sql","utf8");
const analytics = readFileSync("analytics.js","utf8");

const questionIds = [...app.matchAll(/\bid:\s*"([a-z_]+)"\s*,\s*type:\s*"(?:single|slider)"/g)].map(m=>m[1]);

test("keeps 18 unique questions and three score systems", () => {
  assert.equal(questionIds.length, 18);
  assert.equal(new Set(questionIds).size, 18);
  for (const key of ["preferenceScores","backgroundScores","environmentScores"]) assert.match(app,new RegExp(key));
});

test("environment questions do not declare family mappings", () => {
  for (const id of ["income","prestige","security","worklife","intensity"]){
    const start = app.indexOf(`id: "${id}"`);
    const end = app.indexOf("\n  },", start);
    const block = app.slice(start,end);
    assert.match(block,/system:\s*"environment"/);
    assert.doesNotMatch(block,/family\s*:|high:\s*\[F\./);
  }
});

test("result information architecture follows the requested order", () => {
  const ids=["result-hero","result-why","result-common-work","result-alternates","result-profile","result-jobs-section","result-feedback"];
  const positions=ids.map(id=>html.indexOf(`id="${id}"`));
  assert.ok(positions.every(n=>n>=0));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
});

test("sharing uses fixed Story dimensions and referral fields", () => {
  assert.match(product,/canvas\.width=1080/);
  assert.match(product,/canvas\.height=1920/);
  for (const value of ["instagram","story","result_share","utm_content"]) assert.match(product,new RegExp(value));
  assert.match(product,/navigator\.canShare/);
});

test("work focus map defines nine distinct positions", () => {
  const block=product.slice(product.indexOf("const MAP_POSITIONS"),product.indexOf("Results.renderSpectrum"));
  const positions=[...block.matchAll(/\[F\.[A-Z]+\]:\s*\{\s*x:(\d+),\s*y:(\d+)/g)].map(m=>`${m[1]},${m[2]}`);
  assert.equal(positions.length,9);
  assert.equal(new Set(positions).size,9);
});

test("community uses server functions and strips raw content from analytics", () => {
  assert.match(community,/API_BASE="\/.netlify\/functions"/);
  assert.match(community,/community-submit/);
  assert.match(community,/community-report/);
  assert.doesNotMatch(community,/track\([^\n]*(?:nickname|content)\s*:/);
  for (const key of ["content","nickname","email","phone","address","ip","fingerprint"]) assert.match(analytics,new RegExp(key,"i"));
});

test("community database has RLS, public views and no anon base-table grants", () => {
  assert.equal((sql.match(/enable row level security/g)||[]).length,3);
  assert.match(sql,/public_visible_community_posts/);
  assert.match(sql,/public_visible_community_replies/);
  assert.match(sql,/revoke all on public\.community_posts from anon/);
  assert.doesNotMatch(sql,/grant insert on (?:table )?public\.community_posts to anon/);
});

test("mobile CSS includes 390px handling, focus and 44px controls", () => {
  assert.match(css,/@media\s*\(max-width:\s*390px\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/min-height:\s*44px/);
  assert.match(css,/overflow-x:\s*hidden/);
});

test("analytics includes required result, sharing and community events", () => {
  const all = app + product + community;
  const names = [
    "result_primary_cta_clicked","result_share_clicked","result_alternate_role_opened","result_profile_expanded","result_profile_collapsed","result_job_card_clicked",
    "role_compare_started","role_compare_completed","role_compare_job_opened",
    "share_preview_opened","share_image_generated","share_native_started","share_image_downloaded","share_link_copied",
    "community_viewed","community_filter_selected","community_post_submitted","community_reply_submitted","community_report_submitted"
  ];
  for (const name of names) assert.match(all,new RegExp(name));
});
