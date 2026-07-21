/* ==========================================================================
   analytics.js — Data Matters 匿名使用分析（零依賴）
   - 直接呼叫 Supabase REST API（PostgREST）insert，不載入額外套件
   - fetch keepalive：外連點擊不被阻塞、事件在換頁時仍可送出
   - 匿名 session（sessionStorage，關閉分頁即結束）、無 fingerprinting、無 IP 欄位
   - 事件與欄位皆走 allowlist；埋點失敗絕不影響網站功能
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.ANALYTICS_CONFIG || {};
  var SESSION_KEY = "data_matters_session_id";
  var UTM_KEY = "data_matters_utm";
  var ONCE_KEY_PREFIX = "dm_once_";

  /* ── 事件 allowlist（需與 SQL migration 的 constraint 同步）── */
  var ALLOWED_EVENTS = [
    "landing_viewed", "quiz_started", "quiz_step_viewed", "quiz_step_completed",
    "quiz_completed", "result_viewed", "role_opened", "domain_selected",
    "industry_selected", "job_viewed", "external_job_clicked", "quiz_restarted",
    "result_feedback_viewed", "result_feedback_submitted"
  ];

  /* payload 中可直接對應 table column 的欄位；其餘進 properties（也走 allowlist）*/
  var COLUMN_FIELDS = [
    "quiz_step", "role_id", "recommendation_rank", "domain_id", "industry_id",
    "job_id", "company_name", "accuracy_rating", "clarity_before",
    "clarity_after", "preferred_role_id"
  ];
  var ALLOWED_PROPS = [
    "landing_variant", "entry_point", "navigation_direction", "time_spent_sec",
    "answered_question_count", "total_question_count", "total_time_spent_sec",
    "completed_step_count", "result_count", "top_role_id", "second_role_id",
    "third_role_id", "scoring_version", "source", "selection_action",
    "source_section", "list_position", "destination_domain",
    "previous_top_role_id", "preferred_role_was_top_1", "preferred_role_was_top_3",
    "clarity_uplift", "environment", "client_event_id"
  ];
  var MAX_PROP_STR = 200; // properties 內字串長度上限

  /* ── 環境判定：localhost/preview 預設不寫入 production 資料 ── */
  function detectEnv() {
    try {
      var h = location.hostname;
      if (h === "localhost" || h === "127.0.0.1" || h === "" || h === "0.0.0.0") return "local";
      if (/--/.test(h) && /netlify\.app$/.test(h)) return "deploy_preview"; // deploy-preview-N--site.netlify.app
      return "production";
    } catch (e) { return "local"; }
  }
  var ENV = cfg.ANALYTICS_ENV || detectEnv();

  /* ── SUPABASE_URL 驗證：必須是 Project API URL，不能是 Dashboard 網址 ──
     合法：https://<project-ref>.supabase.co
     非法：supabase.com/dashboard/...、含 /rest/v1、非 https */
  function validSupabaseUrl(u) {
    try {
      if (typeof u !== "string" || !/^https:\/\//.test(u)) return false;
      var host = new URL(u).hostname;
      if (!/\.supabase\.co$/.test(host)) return false;      // hostname 必須以 .supabase.co 結尾
      if (u.indexOf("/dashboard") >= 0) return false;       // 不得是 Dashboard 網址
      if (u.indexOf("/rest/v1") >= 0) return false;         // 不得預含 REST 路徑
      return true;
    } catch (e) { return false; }
  }

  var urlValid = validSupabaseUrl(cfg.SUPABASE_URL);
  var enabled = !!(cfg.ANALYTICS_ENABLED && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && urlValid);
  if (cfg.ANALYTICS_ENABLED && (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY)) {
    console.warn("[analytics] Supabase 設定未填（analytics-config.js），使用分析已停用；網站功能不受影響。");
  } else if (cfg.ANALYTICS_ENABLED && !urlValid) {
    console.warn("[analytics] SUPABASE_URL 格式錯誤，使用分析已停用。需為 Project API URL（https://<project>.supabase.co），不是 supabase.com/dashboard 網址。");
  }
  // local 環境預設不送出（可用 ANALYTICS_DEBUG 觀察 payload）
  var sendAllowed = enabled && (ENV !== "local" || cfg.ANALYTICS_DEBUG === true);

  if (cfg.ANALYTICS_DEBUG) {
    var dbgHost = null;
    try { dbgHost = new URL(cfg.SUPABASE_URL).hostname; } catch (e) {}
    console.log("[analytics] enabled:", sendAllowed, "| supabase host:", dbgHost, "| url valid:", urlValid, "| env:", ENV);
    // 刻意不輸出 anon key
  }

  /* ── 匿名 session ID（同分頁共用；新分頁 = 新 session）── */
  function uuid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      // 安全 fallback（RFC4122 v4，使用 getRandomValues）
      var buf = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40; buf[8] = (buf[8] & 0x3f) | 0x80;
      var h = Array.prototype.map.call(buf, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);
    } catch (e) {
      // 最後手段（不含 crypto 的環境）
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }
  }
  function sget(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } }
  function sset(k,v){ try { sessionStorage.setItem(k,v); } catch(e){} }

  function sessionId() {
    var id = sget(SESSION_KEY);
    if (!id) { id = uuid(); sset(SESSION_KEY, id); }
    return id;
  }

  /* ── device_type：簡單判定，不解析完整 UA、不做 fingerprinting ── */
  function deviceType() {
    try {
      var w = Math.min(screen.width || 9999, window.innerWidth || 9999);
      var touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
      if (touch && w < 768) return "mobile";
      if (touch && w < 1100) return "tablet";
      if (w >= 768) return "desktop";
      return "unknown";
    } catch (e) { return "unknown"; }
  }

  /* ── referrer 只留 domain；UTM 只從首次進站 URL 讀取並存 session ── */
  function refDomain() {
    try {
      if (!document.referrer) return null;
      var host = new URL(document.referrer).hostname;
      return host === location.hostname ? null : (host || null);
    } catch (e) { return null; }
  }
  function captureUtm() {
    var stored = sget(UTM_KEY);
    if (stored) { try { return JSON.parse(stored); } catch (e) { return {}; } }
    var utm = {};
    try {
      var q = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
        var v = q.get(k);
        if (v) utm[k] = String(v).slice(0, 100);
      });
    } catch (e) {}
    sset(UTM_KEY, JSON.stringify(utm));
    return utm;
  }
  var UTM = captureUtm();
  var REFERRER = refDomain();

  /* ── 去重 guards ── */
  var firedOnce = {};                // in-memory（result run 相關）
  function oncePerSession(name) {
    var k = ONCE_KEY_PREFIX + name;
    if (sget(k)) return false;
    sset(k, "1");
    return true;
  }

  /* ── payload 清理：欄位分流 + properties allowlist + 長度限制 ── */
  function sanitize(payload) {
    var cols = {}, props = {};
    Object.keys(payload || {}).forEach(function (k) {
      var v = payload[k];
      if (v === undefined || v === null) return;
      if (COLUMN_FIELDS.indexOf(k) >= 0) {
        cols[k] = (typeof v === "string") ? v.slice(0, 200) : v;
      } else if (ALLOWED_PROPS.indexOf(k) >= 0) {
        props[k] = (typeof v === "string") ? v.slice(0, MAX_PROP_STR) : v;
      }
      // 不在 allowlist 的欄位一律丟棄（防止誤傳 answers / DOM / state）
    });
    return { cols: cols, props: props };
  }

  /* ── 送出（REST insert；keepalive；失敗最多短暫重試一次）── */
  function send(row, isRetry) {
    if (!sendAllowed) return;
    try {
      fetch(cfg.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/analytics_events", {
        method: "POST",
        keepalive: true, // 換頁 / 外連時仍可送出，不阻塞導航
        headers: {
          "apikey": cfg.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + cfg.SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal" // 不需要回傳 inserted row
        },
        body: JSON.stringify([row])
      }).then(function (res) {
        if (!res.ok && !isRetry && res.status >= 500) {
          setTimeout(function () { send(row, true); }, 600); // 同一 client_event_id，可於後端去重
        } else if (!res.ok) {
          console.warn("[analytics] insert failed:", res.status);
        }
      }).catch(function () {
        if (!isRetry) setTimeout(function () { send(row, true); }, 600);
        else console.warn("[analytics] insert failed (network)");
      });
    } catch (e) { console.warn("[analytics] send error"); }
  }

  /**
   * 追蹤事件（唯一入口）
   * @param {string} eventName - 必須在 ALLOWED_EVENTS 清單中
   * @param {Object} [payload] - 欄位自動分流：COLUMN_FIELDS → table columns，
   *                             ALLOWED_PROPS → properties JSON，其餘丟棄
   */
  function track(eventName, payload) {
    try {
      if (ALLOWED_EVENTS.indexOf(eventName) < 0) {
        if (cfg.ANALYTICS_DEBUG) console.warn("[analytics] 未知事件被拒絕:", eventName);
        return;
      }
      var clean = sanitize(payload || {});
      clean.props.environment = ENV;
      clean.props.client_event_id = uuid();

      var row = {
        session_id: sessionId(),
        event_name: eventName,
        page_path: (location.pathname || "/").slice(0, 500),
        app_version: cfg.APP_VERSION || "v1",
        device_type: deviceType(),
        referrer_domain: REFERRER || undefined,
        utm_source: UTM.utm_source,
        utm_medium: UTM.utm_medium,
        utm_campaign: UTM.utm_campaign,
        properties: clean.props
        // occurred_at 刻意省略：由 DB default now() 產生，前端指定會被 RLS 擋下
      };
      Object.keys(clean.cols).forEach(function (k) { row[k] = clean.cols[k]; });
      Object.keys(row).forEach(function (k) { if (row[k] === undefined) delete row[k]; });

      if (cfg.ANALYTICS_DEBUG) console.log("[analytics]", eventName, row);
      send(row, false);
    } catch (e) { /* 埋點錯誤絕不影響網站 */ }
  }

  /* 對外 API */
  window.DMAnalytics = {
    track: track,
    trackOncePerSession: function (name, payload) { if (oncePerSession(name)) track(name, payload); },
    trackOncePerRun: function (runKey, name, payload) {
      if (firedOnce[runKey]) return;
      firedOnce[runKey] = true;
      track(name, payload);
    },
    resetRunGuards: function (prefix) {
      Object.keys(firedOnce).forEach(function (k) { if (k.indexOf(prefix) === 0) delete firedOnce[k]; });
    },
    sessionId: sessionId,
    env: ENV,
    enabled: sendAllowed,
    _allowedEvents: ALLOWED_EVENTS.slice()
  };
})();
