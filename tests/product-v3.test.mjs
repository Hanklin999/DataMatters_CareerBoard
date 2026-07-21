import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

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

test("sharing uses fixed Story dimensions, a larger role image and no QR code", () => {
  assert.match(product,/canvas\.width=1080/);
  assert.match(product,/canvas\.height=1920/);
  for (const value of ["instagram","story","result_share","utm_content"]) assert.match(product,new RegExp(value));
  assert.match(product,/navigator\.canShare/);
  assert.match(product,/data-matters-\$\{shareRoleId\}-story\.png/);
  assert.match(product,/const size=720/);
  assert.doesNotMatch(product,/window\.qrcode|qr\.getModuleCount/);
  assert.doesNotMatch(html,/vendor\/qrcode\.js/);
  assert.doesNotMatch(product,/純網頁無法保證直接發布到 Instagram Stories/);
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
  assert.match(sql,/revoke all on public\.public_visible_community_posts from public, anon, authenticated/);
  assert.match(sql,/community_reports_one_per_fingerprint_idx/);
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
    "community_viewed","community_post_submitted","community_reply_submitted","community_report_submitted"
  ];
  for (const name of names) assert.match(all,new RegExp(name));
});


test("community validation blocks personal data and obvious spam", () => {
  const { validateNickname, validateContent } = require("../netlify/functions/_community-utils.js");
  assert.equal(validateNickname("test@example.com"), "personal_data");
  assert.equal(validateContent("請聯絡 0912-345-678 討論", 2, 300), "personal_data");
  assert.equal(validateContent("台北市信義區松仁路100號", 2, 300), "personal_data");
  assert.equal(validateContent("保證獲利，加入投資群組", 2, 300), "blocked_content");
  assert.equal(validateContent("我想了解資料分析和產品分析的差別", 2, 300), null);
});


test("community no longer asks users to classify posts", () => {
  assert.doesNotMatch(community,/community-category|CATEGORIES|setCategory/);
  assert.doesNotMatch(community,/community_filter_selected/);
  assert.match(community,/community-sort/);
});

test("result hero keeps the English function name and square uncropped artwork", () => {
  assert.match(product,/real-role-en/);
  assert.match(css,/object-fit:contain/);
  assert.match(css,/width:min\(440px,100%\)/);
});

test("encyclopedia changes one card per click and centers the active card deterministically", () => {
  assert.match(app,/class="ency-track"/);
  assert.match(app,/Encyclopedia\._activeIndex/);
  assert.match(app,/syncCarousel\(next\); \/\/ active card grows immediately/);
  assert.match(app,/targetTranslate/);
  assert.match(app,/translate3d/);
  assert.match(app,/pointermove/);
  assert.match(app,/if \(id === "encyclopedia"\)/);
  assert.match(css,/\.ency-track/);
  assert.match(css,/--ency-card-width/);
  assert.match(css,/overflow:hidden!important/);
  assert.match(html,/ency-pagination/);
});

test("work-focus axes and disclaimer use a dedicated non-overlapping layout", () => {
  assert.match(html,/focus-y-axis/);
  assert.match(html,/改變整個組織/);
  assert.match(html,/解決單一問題/);
  assert.match(html,/focus-map-main/);
  assert.match(css,/focus-map-section \.focus-map-layout/);
  assert.match(css,/focus-y-rail/);
});

test("community read falls back safely when public views are unavailable", () => {
  const read = readFileSync("netlify/functions/community-read.js","utf8");
  const repair = readFileSync("supabase/migrations/005_repair_community_read.sql","utf8");
  assert.match(read,/readFromViews/);
  assert.match(read,/readFromBaseTables/);
  assert.match(read,/community_schema_missing/);
  assert.match(repair,/grant select, insert, update, delete on public\.community_posts to service_role/);
  assert.match(repair,/public_visible_community_posts/);
});

test("mobile result hero eagerly loads and always reserves visible artwork space", () => {
  assert.match(app,/const isHero/);
  assert.match(app,/loading = isHero \? "eager" : "lazy"/);
  assert.match(app,/fetchpriority="high"/);
  assert.match(css,/\.result-hero-art\{display:flex!important/);
  assert.match(css,/min-height:min\(310px,78vw\)/);
});

test("analytics rejects malformed Supabase project URLs", () => {
  assert.match(analytics,/parsed\.protocol !== "https:"/);
  assert.match(analytics,/\^\[a-z0-9-\]\+\\.supabase\\.co\$/i);
  assert.match(analytics,/cleanPath !== ""/);
  assert.match(analytics,/parsed\.search/);
  assert.match(analytics,/parsed\.hash/);
});

test("community submission uses a legacy-safe hidden category and exposes setup errors", () => {
  const submit = readFileSync("netlify/functions/community-submit.js","utf8");
  assert.match(submit,/COMMUNITY_DEFAULT_CATEGORY\|\|"職涯方向"/);
  assert.match(submit,/community_schema_missing/);
  assert.match(submit,/community_permission_missing/);
  assert.match(submit,/community_schema_outdated/);
  assert.match(community,/留言資料庫版本尚未更新/);
});

test("mobile result hero has deterministic heading-art-body order and full-width actions", () => {
  assert.match(product,/result-hero-heading/);
  assert.match(product,/result-hero-art/);
  assert.match(product,/result-hero-body/);
  const heading = product.indexOf('class="result-hero-heading result-role-detail-trigger"');
  const art = product.indexOf('class="result-hero-art result-role-detail-trigger"');
  const body = product.indexOf('class="result-hero-body"');
  assert.ok(heading >= 0 && art > heading && body > art);
  assert.match(css,/grid-template-areas:\s*\n\s*"heading"\s*\n\s*"art"\s*\n\s*"body"/);
  assert.match(css,/\.result-hero-actions\{[\s\S]*grid-template-columns:1fr!important/);
  assert.match(css,/\.result-hero-art \.square-portrait\{[\s\S]*aspect-ratio:1\/1!important/);
  assert.match(css,/\.result-hero-body \.hero-tagline\{[\s\S]*overflow-wrap:anywhere/);
});


test("role detail actions are exported and available from atlas and primary result", () => {
  assert.match(app,/DataMattersRoleDetail:\{open:openRoleDetail\}/);
  assert.match(app,/data-role-detail=/);
  assert.match(app,/detailButton\.addEventListener\("click"/);
  assert.match(product,/Results\.openPrimaryRole/);
  assert.match(product,/data-primary-role-detail/);
  assert.match(product,/認識這個角色/);
});

test("community server accepts Netlify public URL fallback and modern Supabase secret key", () => {
  const utils=readFileSync("netlify/functions/_community-utils.js","utf8");
  const health=readFileSync("netlify/functions/community-health.js","utf8");
  assert.match(utils,/\["SUPABASE_URL","VITE_SUPABASE_URL"\]/);
  assert.match(utils,/\["SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SECRET_KEY"\]/);
  assert.match(health,/communityConfigStatus/);
  assert.match(health,/database:true/);
});

test("mobile result artwork has a final hard-centering rule", () => {
  assert.match(css,/#result-hero \.result-hero-art\{[\s\S]*place-items:center!important/);
  assert.match(css,/#result-hero \.result-hero-art \.square-portrait\{[\s\S]*margin-inline:auto!important/);
  assert.match(css,/transform:none!important/);
});
