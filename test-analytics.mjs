#!/usr/bin/env node
/**
 * test-analytics.mjs — 匿名埋點單元測試（零依賴）
 * 用法：node test-analytics.mjs
 */
import { readFileSync } from "node:fs";

let failures = 0;
function check(name, cond, extra){
  if (cond) console.log("  ✓ " + name);
  else { failures++; console.log("  ✗ " + name + (extra ? "｜" + extra : "")); }
}

/* ── stubs ── */
const store = {};
global.sessionStorage = {
  getItem: k => store[k] ?? null,
  setItem: (k,v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
global.location = { hostname: "datamatters-hanks-career-board.netlify.app", pathname: "/", search: "?utm_source=threads&utm_medium=social" };
global.screen = { width: 1440 };
global.window = global;
Object.defineProperty(global, "navigator", { value: { maxTouchPoints: 0 }, configurable: true });
global.document = { referrer: "https://www.threads.com/@hank00117" };
// Node 22 已內建 global crypto（含 randomUUID），無需覆寫
const sent = [];
global.fetch = (url, opts) => { sent.push({ url, body: JSON.parse(opts.body) }); return Promise.resolve({ ok: true, status: 201 }); };

global.ANALYTICS_CONFIG = {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  ANALYTICS_ENABLED: true,
  ANALYTICS_DEBUG: false,
  APP_VERSION: "v1", SCORING_VERSION: "v2"
};
window.ANALYTICS_CONFIG = global.ANALYTICS_CONFIG;

(0, eval)(readFileSync("analytics.js", "utf8"));
const A = window.DMAnalytics;

console.log("【analytics.js 單元測試】");
check("production 環境判定", A.env === "production", A.env);
check("已啟用", A.enabled === true);

// session 一致性
const s1 = A.sessionId(), s2 = A.sessionId();
check("同一 tab session ID 一致", s1 === s2 && /^[0-9a-f-]{36}$/.test(s1));

// 事件送出與欄位
A.track("landing_viewed", { landing_variant: "default" });
await new Promise(r => setTimeout(r, 10));
check("合法事件已送出", sent.length === 1);
const row = sent[0].body[0];
check("REST endpoint 正確", sent[0].url.includes("/rest/v1/analytics_events"));
check("row 含 session_id / event_name / device_type", row.session_id === s1 && row.event_name === "landing_viewed" && ["mobile","tablet","desktop","unknown"].includes(row.device_type));
check("occurred_at 未由前端指定（交給 DB default）", row.occurred_at === undefined);
check("UTM 從首次 URL 捕捉", row.utm_source === "threads" && row.utm_medium === "social");
check("referrer 只留 domain", row.referrer_domain === "www.threads.com");
check("properties 含 environment 與 client_event_id", row.properties.environment === "production" && /^[0-9a-f-]{36}$/.test(row.properties.client_event_id));

// 未知事件拒絕
A.track("hacked_event", { foo: 1 });
await new Promise(r => setTimeout(r, 10));
check("未知事件被拒絕", sent.length === 1);

// 欄位 allowlist：answers 與未知欄位不得外洩
A.track("quiz_completed", { total_time_spent_sec: 42, answers: { major: 2, income: 5 }, secret_dom: "<div>", result_count: 3 });
await new Promise(r => setTimeout(r, 10));
const row2 = sent[1].body[0];
check("answers / 未知欄位被丟棄", row2.properties.answers === undefined && row2.properties.secret_dom === undefined && row2.answers === undefined);
check("合法 properties 保留", row2.properties.total_time_spent_sec === 42 && row2.properties.result_count === 3);

// 欄位分流：column fields 進 top-level
A.track("result_feedback_submitted", { accuracy_rating: 5, clarity_before: 2, clarity_after: 4, preferred_role_id: "X", role_id: "Y", clarity_uplift: 2 });
await new Promise(r => setTimeout(r, 10));
const row3 = sent[2].body[0];
check("column 欄位進 top-level、props 進 properties", row3.accuracy_rating === 5 && row3.clarity_before === 2 && row3.properties.clarity_uplift === 2);

// once per session
A.trackOncePerSession("landing_viewed", {});
A.trackOncePerSession("landing_viewed", {});
await new Promise(r => setTimeout(r, 10));
check("trackOncePerSession 去重", sent.length === 4); // 只多 1 筆

// once per run
A.trackOncePerRun("fb_1", "result_feedback_viewed", {});
A.trackOncePerRun("fb_1", "result_feedback_viewed", {});
await new Promise(r => setTimeout(r, 10));
check("trackOncePerRun 去重", sent.length === 5);

// 長字串截斷
A.track("job_viewed", { source_section: "x".repeat(500), job_id: "j1" });
await new Promise(r => setTimeout(r, 10));
check("properties 字串截斷至 200", sent[5].body[0].properties.source_section.length === 200);

// 缺 config → 停用不炸
const store2 = {}; // fresh session storage
global.sessionStorage = { getItem: k => store2[k] ?? null, setItem: (k,v)=>{store2[k]=String(v);}, removeItem: k=>{delete store2[k];} };
window.ANALYTICS_CONFIG = { SUPABASE_URL: "", SUPABASE_ANON_KEY: "", ANALYTICS_ENABLED: true };
window.DMAnalytics = undefined;
(0, eval)(readFileSync("analytics.js", "utf8"));
const B = window.DMAnalytics;
const before = sent.length;
B.track("landing_viewed", {});
await new Promise(r => setTimeout(r, 10));
check("缺 Supabase 設定：停用且不拋錯", B.enabled === false && sent.length === before);

// localhost 預設不送
global.location = { hostname: "localhost", pathname: "/", search: "" };
window.ANALYTICS_CONFIG = { SUPABASE_URL: "https://test.supabase.co", SUPABASE_ANON_KEY: "test-anon-key", ANALYTICS_ENABLED: true, ANALYTICS_DEBUG: false }; // 有 key 的完整設定
window.DMAnalytics = undefined;
const store3 = {};
global.sessionStorage = { getItem: k => store3[k] ?? null, setItem: (k,v)=>{store3[k]=String(v);}, removeItem: k=>{delete store3[k];} };
(0, eval)(readFileSync("analytics.js", "utf8"));
const C = window.DMAnalytics;
const before2 = sent.length;
C.track("landing_viewed", {});
await new Promise(r => setTimeout(r, 10));
check("localhost 預設不寫入 production", C.env === "local" && C.enabled === false && sent.length === before2);

// URL validation：Dashboard 網址必須被拒絕並停用
for (const [label, badUrl] of [
  ["Dashboard 網址", "https://supabase.com/dashboard/project/rmflseoygadbocpkgxyi"],
  ["含 /rest/v1", "https://rmflseoygadbocpkgxyi.supabase.co/rest/v1"],
  ["http 非 https", "http://rmflseoygadbocpkgxyi.supabase.co"],
  ["非 supabase.co 網域", "https://rmflseoygadbocpkgxyi.evil.com"]
]){
  window.ANALYTICS_CONFIG = { SUPABASE_URL: badUrl, SUPABASE_ANON_KEY: "k", ANALYTICS_ENABLED: true };
  window.DMAnalytics = undefined;
  const st = {}; global.sessionStorage = { getItem: k => st[k] ?? null, setItem: (k,v)=>{st[k]=String(v);}, removeItem: k=>{delete st[k];} };
  global.location = { hostname: "datamatters-hanks-career-board.netlify.app", pathname: "/", search: "" };
  (0, eval)(readFileSync("analytics.js", "utf8"));
  const D = window.DMAnalytics;
  const b = sent.length;
  D.track("landing_viewed", {});
  await new Promise(r => setTimeout(r, 10));
  check(`URL validation 拒絕：${label}`, D.enabled === false && sent.length === b, badUrl);
}
// 正確 URL 通過 validation
{
  window.ANALYTICS_CONFIG = { SUPABASE_URL: "https://rmflseoygadbocpkgxyi.supabase.co", SUPABASE_ANON_KEY: "k", ANALYTICS_ENABLED: true };
  window.DMAnalytics = undefined;
  const st = {}; global.sessionStorage = { getItem: k => st[k] ?? null, setItem: (k,v)=>{st[k]=String(v);}, removeItem: k=>{delete st[k];} };
  (0, eval)(readFileSync("analytics.js", "utf8"));
  const E = window.DMAnalytics;
  const b = sent.length;
  E.track("landing_viewed", {});
  await new Promise(r => setTimeout(r, 10));
  check("正確 Project URL 通過並送至 .supabase.co/rest/v1", E.enabled === true && sent.length === b + 1 && sent[sent.length-1].url === "https://rmflseoygadbocpkgxyi.supabase.co/rest/v1/analytics_events");
}

console.log("\n" + (failures ? `✗ ${failures} 項未通過` : "✓ analytics 測試全部通過"));
process.exit(failures ? 1 : 0);
