import { readFileSync } from "node:fs";
import vm from "node:vm";

const registryCode = readFileSync("analytics-events.js", "utf8");
const analyticsCode = readFileSync("analytics.js", "utf8");

const results = [];
function check(label, condition) {
  if (!condition) {
    results.push({ label, ok: false });
    console.error(`  ✗ ${label}`);
  } else {
    results.push({ label, ok: true });
    console.log(`  ✓ ${label}`);
  }
}

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
  };
}

function loadAnalytics({
  hostname = "datamatters.example.com",
  pathname = "/",
  search = "",
  referrer = "",
  url = "https://rmflseoygadbocpkgxyi.supabase.co",
  anonKey = "anon-key",
  enabled = true,
  environment = "production",
  debug = false,
  loadRegistry = true,
  storage = createStorage()
} = {}) {
  const requests = [];
  const warnings = [];
  const logs = [];
  let uuidCounter = 0;

  const location = { hostname, pathname, search };
  const document = { referrer };
  const navigator = { maxTouchPoints: 0 };
  const screen = { width: 1280 };
  const crypto = {
    randomUUID() {
      uuidCounter += 1;
      return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
    }
  };

  const window = {
    ANALYTICS_CONFIG: {
      ANALYTICS_ENABLED: enabled,
      ANALYTICS_ENV: environment,
      ANALYTICS_DEBUG: debug,
      SUPABASE_URL: url,
      SUPABASE_ANON_KEY: anonKey,
      APP_VERSION: "v3.10"
    },
    DATA_MATTERS_APP_VERSION: "v3.10",
    innerWidth: 1280,
    crypto
  };

  const fetch = (requestUrl, options = {}) => {
    requests.push({ url: String(requestUrl), options });
    return Promise.resolve({ ok: true, status: 201 });
  };

  const context = {
    window,
    location,
    document,
    navigator,
    screen,
    sessionStorage: storage,
    fetch,
    URL,
    URLSearchParams,
    Uint8Array,
    Math,
    setTimeout,
    clearTimeout,
    console: {
      warn(...args) { warnings.push(args.map(String).join(" ")); },
      log(...args) { logs.push(args); },
      error(...args) { warnings.push(args.map(String).join(" ")); }
    }
  };
  Object.assign(window, {
    window,
    location,
    document,
    navigator,
    screen,
    sessionStorage: storage,
    fetch,
    URL,
    URLSearchParams,
    Uint8Array,
    Math,
    setTimeout,
    clearTimeout,
    console: context.console
  });

  vm.createContext(context);
  if (loadRegistry) vm.runInContext(registryCode, context, { filename: "analytics-events.js" });
  vm.runInContext(analyticsCode, context, { filename: "analytics.js" });
  return { context, analytics: window.DMAnalytics, requests, warnings, logs, storage };
}

function parseRow(request) {
  const parsed = JSON.parse(request.options.body);
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

console.log("【analytics.js 單元測試】");

{
  const { analytics } = loadAnalytics();
  check("production 環境判定", analytics.environment === "production" && analytics.env === "production");
  check("已啟用", analytics.enabled === true);
}

{
  const sharedStorage = createStorage();
  const first = loadAnalytics({ storage: sharedStorage });
  const second = loadAnalytics({ storage: sharedStorage });
  check("同一 tab session ID 一致", first.analytics.sessionId() === second.analytics.sessionId());
}

{
  const run = loadAnalytics({
    pathname: "/career",
    search: "?utm_source=threads&utm_medium=social&utm_campaign=launch",
    referrer: "https://example.org/article"
  });
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.track(E.RESULT_VIEWED, {
    role_id: "Data Analytics & Business Intelligence",
    source: "result_page",
    answers: { q1: 5 },
    unknown_field: "drop-me"
  });
  const request = run.requests[0];
  const row = parseRow(request);
  check("合法事件已送出", run.requests.length === 1);
  check("REST endpoint 正確", request.url === "https://rmflseoygadbocpkgxyi.supabase.co/rest/v1/analytics_events");
  check("row 含 session_id / event_name / device_type", Boolean(row.session_id) && row.event_name === E.RESULT_VIEWED && row.device_type === "desktop");
  check("occurred_at 未由前端指定（交給 DB default）", !("occurred_at" in row));
  check("UTM 從首次 URL 捕捉", row.utm_source === "threads" && row.utm_medium === "social" && row.utm_campaign === "launch");
  check("referrer 只留 domain", row.referrer_domain === "example.org");
  check("properties 含 environment 與 client_event_id", row.properties.environment === "production" && Boolean(row.properties.client_event_id));
  check("answers / 未知欄位被丟棄", !("answers" in row.properties) && !("unknown_field" in row.properties));
}

{
  const run = loadAnalytics();
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.track("unknown_event", {});
  check("未知事件被拒絕", run.requests.length === 0);
  run.analytics.track(E.RESULT_HERO_VIEWED, { match_level: "high", source_page: "results" });
  const row = parseRow(run.requests[0]);
  check("合法 properties 保留", row.properties.match_level === "high" && row.properties.source_page === "results");
}

{
  const run = loadAnalytics();
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.track(E.ACCURACY_RATING_SUBMITTED, {
    role_id: "role-a",
    accuracy_rating: 5,
    source: "feedback"
  });
  const row = parseRow(run.requests[0]);
  check("column 欄位進 top-level、props 進 properties", row.role_id === "role-a" && row.accuracy_rating === 5 && row.properties.source === "feedback");
}

{
  const run = loadAnalytics();
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.trackOncePerSession(E.LANDING_VIEWED, { landing_variant: "default" });
  run.analytics.trackOncePerSession(E.LANDING_VIEWED, { landing_variant: "default" });
  check("trackOncePerSession 去重", run.requests.length === 1);
  run.analytics.trackOncePerRun("hero", E.RESULT_HERO_VIEWED, {});
  run.analytics.trackOncePerRun("hero", E.RESULT_HERO_VIEWED, {});
  check("trackOncePerRun 去重", run.requests.length === 2);
}

{
  const run = loadAnalytics();
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.track(E.COMMUNITY_POST_FAILED, { error_type: "x".repeat(500) });
  const row = parseRow(run.requests[0]);
  check("properties 字串截斷至 200", row.properties.error_type.length === 200);
}

{
  const run = loadAnalytics({ url: "", anonKey: "", enabled: true });
  run.analytics.track(run.context.window.DMAnalyticsEvents.EVENTS.LANDING_VIEWED, {});
  check("缺 Supabase 設定：停用且不拋錯", run.analytics.enabled === false && run.requests.length === 0);
}

{
  const run = loadAnalytics({ hostname: "localhost", environment: "local", debug: false });
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.track(E.LANDING_VIEWED, {});
  check("localhost 預設不寫入 production", run.analytics.enabled === false && run.requests.length === 0);
}

for (const [label, url] of [
  ["Dashboard 網址", "https://supabase.com/dashboard/project/rmflseoygadbocpkgxyi"],
  ["含 /rest/v1", "https://rmflseoygadbocpkgxyi.supabase.co/rest/v1"],
  ["http 非 https", "http://rmflseoygadbocpkgxyi.supabase.co"],
  ["非 supabase.co 網域", "https://rmflseoygadbocpkgxyi.evil.com"]
]) {
  const run = loadAnalytics({ url });
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.track(E.LANDING_VIEWED, {});
  check(`URL validation 拒絕：${label}｜${url}`, run.requests.length === 0 && run.analytics.enabled === false);
}

{
  const run = loadAnalytics({ url: "https://rmflseoygadbocpkgxyi.supabase.co" });
  const E = run.context.window.DMAnalyticsEvents.EVENTS;
  run.analytics.track(E.LANDING_VIEWED, {});
  check("正確 Project URL 通過並送至 .supabase.co/rest/v1", run.requests.length === 1 && run.requests[0].url.endsWith(".supabase.co/rest/v1/analytics_events"));
}

{
  const run = loadAnalytics({ loadRegistry: false, debug: true });
  run.analytics.track("landing_viewed", {});
  check("缺少事件 registry 時安全停用", run.analytics.enabled === false && run.requests.length === 0);
  check("debug 模式明確警告 registry 缺失", run.warnings.some(message => message.includes("Event registry is missing")));
  check("_allowedEvents 由 registry 產生", Array.isArray(run.analytics._allowedEvents) && run.analytics._allowedEvents.length === 0);
}

{
  const run = loadAnalytics();
  const names = run.context.window.DMAnalyticsEvents.EVENT_NAMES;
  check("_allowedEvents 與 registry 完全一致", JSON.stringify([...run.analytics._allowedEvents].sort()) === JSON.stringify([...names].sort()));
}

const failed = results.filter(item => !item.ok);
if (failed.length) {
  console.error(`\n✗ ${failed.length} 項未通過`);
  process.exit(1);
}
console.log(`\n✓ ${results.length} 項全部通過`);
