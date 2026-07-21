/* ========================================================================== 
   analytics.js — Data Matters 匿名使用分析（零依賴）
   - 保留既有 analytics API contract，避免破壞 test-analytics.mjs
   - 事件與 properties 皆採 allowlist，避免誤傳答案、留言或個資
   - localhost 預設停用；埋點失敗不影響主要功能
   ========================================================================== */
(function () {
  "use strict";

  var cfg = window.ANALYTICS_CONFIG || {};
  var SESSION_KEY = "data_matters_session_id";
  var UTM_KEY = "data_matters_utm";
  var ONCE_KEY_PREFIX = "dm_once_";

  var ALLOWED_EVENTS = [
    /* Core funnel */
    "landing_viewed", "page_viewed", "quiz_started", "quiz_step_viewed",
    "quiz_step_completed", "quiz_question_answered", "quiz_completed",
    "result_viewed", "result_hero_viewed", "role_opened",
    "alternate_role_opened", "domain_selected", "industry_selected",
    "job_opened", "job_viewed", "external_job_clicked", "quiz_restarted",

    /* Result actions and feedback */
    "result_primary_cta_clicked", "result_share_clicked",
    "result_alternate_role_opened", "result_profile_expanded",
    "result_profile_collapsed", "result_job_card_clicked",
    "result_feedback_viewed", "result_feedback_submitted",
    "clarity_before_submitted", "clarity_after_submitted",
    "accuracy_rating_submitted",

    /* Role comparison */
    "role_compare_started", "role_compare_completed", "role_compare_job_opened",

    /* Result sharing */
    "share_preview_opened", "share_image_generation_started",
    "share_image_generated", "share_image_generation_failed",
    "share_native_started", "share_native_completed", "share_native_cancelled",
    "share_image_downloaded", "share_link_copied", "shared_result_landed",
    "shared_result_quiz_started", "shared_result_quiz_completed",

    /* Community */
    "community_viewed", "community_filter_selected", "community_sort_changed",
    "community_post_form_opened", "community_post_submitted",
    "community_post_failed", "community_post_opened",
    "community_reply_form_opened", "community_reply_submitted",
    "community_reply_failed", "community_report_opened",
    "community_report_submitted"
  ];

  var COLUMN_FIELDS = [
    "quiz_step", "role_id", "recommendation_rank", "domain_id", "industry_id",
    "job_id", "company_name", "accuracy_rating", "clarity_before",
    "clarity_after", "preferred_role_id"
  ];

  var ALLOWED_PROPS = [
    /* Existing contract */
    "landing_variant", "entry_point", "navigation_direction", "time_spent_sec",
    "answered_question_count", "total_question_count", "total_time_spent_sec",
    "completed_step_count", "result_count", "top_role_id", "second_role_id",
    "third_role_id", "scoring_version", "source", "selection_action",
    "source_section", "list_position", "destination_domain",
    "previous_top_role_id", "preferred_role_was_top_1",
    "preferred_role_was_top_3", "clarity_uplift", "environment",
    "client_event_id",

    /* Question diagnostics */
    "question_id", "selected_option", "response_time_ms", "changed_answer",
    "previous_option", "role_weight_mapping_version",

    /* Result and sharing */
    "match_level", "result_clarity", "share_method", "role_pair",
    "referral_source", "source_page", "target_type", "reason",

    /* Community — never include nickname/content */
    "category", "user_type", "content_length_bucket", "reply_count_bucket",
    "sort", "error_type"
  ];

  var MAX_PROP_STR = 200;
  var DENY_KEYS = /content|message|nickname|email|phone|address|full_answer|answer_text|ip|fingerprint/i;

  function detectEnv() {
    try {
      var h = location.hostname;
      if (h === "localhost" || h === "127.0.0.1" || h === "" || h === "0.0.0.0") return "local";
      if (/--/.test(h) && /netlify\.app$/.test(h)) return "deploy_preview";
      return "production";
    } catch (e) {
      return "local";
    }
  }

  var ENV = cfg.ANALYTICS_ENV || detectEnv();
  var configured = !!(
    cfg.ANALYTICS_ENABLED &&
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    !/^__/.test(String(cfg.SUPABASE_URL)) &&
    !/^__/.test(String(cfg.SUPABASE_ANON_KEY))
  );

  if ((!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) && cfg.ANALYTICS_ENABLED) {
    try { console.warn("[analytics] Supabase 設定未填，使用分析已停用；網站功能不受影響。"); } catch (e) {}
  }

  /* local 預設不寫入 production；debug 僅用於明確的本機測試 */
  var sendAllowed = configured && (ENV !== "local" || cfg.ANALYTICS_DEBUG === true);

  function uuid() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
      var buf = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      var hex = Array.prototype.map.call(buf, function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
      return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
    } catch (e) {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }
  }

  function sget(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function sset(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }

  function sessionId() {
    var id = sget(SESSION_KEY);
    if (!id) {
      id = uuid();
      sset(SESSION_KEY, id);
    }
    return id;
  }

  function deviceType() {
    try {
      var screenWidth = (typeof screen !== "undefined" && screen.width) || 9999;
      var innerWidth = (typeof window !== "undefined" && window.innerWidth) || 9999;
      var width = Math.min(screenWidth, innerWidth);
      var touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
      if (touch && width < 768) return "mobile";
      if (touch && width < 1100) return "tablet";
      if (width >= 768) return "desktop";
      return "unknown";
    } catch (e) {
      return "unknown";
    }
  }

  function refDomain() {
    try {
      if (!document.referrer) return null;
      var host = new URL(document.referrer).hostname;
      return host === location.hostname ? null : (host || null);
    } catch (e) {
      return null;
    }
  }

  function captureUtm() {
    var stored = sget(UTM_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    var utm = {};
    try {
      var q = new URLSearchParams(location.search);
      ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
        var value = q.get(key);
        if (value) utm[key] = String(value).slice(0, 100);
      });
    } catch (e) {}
    sset(UTM_KEY, JSON.stringify(utm));
    return utm;
  }

  var UTM = captureUtm();
  var REFERRER = refDomain();
  var firedOnce = {};

  function oncePerSession(key) {
    var storageKey = ONCE_KEY_PREFIX + key;
    if (sget(storageKey)) return false;
    sset(storageKey, "1");
    return true;
  }

  function cleanProp(value) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "string") return value.slice(0, MAX_PROP_STR);
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (Array.isArray(value)) {
      return value.slice(0, 10).map(function (item) {
        return typeof item === "string" ? item.slice(0, MAX_PROP_STR) : item;
      }).filter(function (item) {
        return typeof item === "string" || typeof item === "number" || typeof item === "boolean";
      });
    }
    return undefined;
  }

  function sanitize(payload) {
    var cols = {};
    var props = {};
    Object.keys(payload || {}).forEach(function (key) {
      var value = payload[key];
      if (value === undefined || value === null || DENY_KEYS.test(key)) return;
      if (COLUMN_FIELDS.indexOf(key) >= 0) {
        cols[key] = typeof value === "string" ? value.slice(0, 200) : value;
      } else if (ALLOWED_PROPS.indexOf(key) >= 0) {
        var cleaned = cleanProp(value);
        if (cleaned !== undefined) props[key] = cleaned;
      }
    });
    return { cols: cols, props: props };
  }

  function send(row, isRetry) {
    if (!sendAllowed) return;
    try {
      fetch(cfg.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/analytics_events", {
        method: "POST",
        keepalive: true,
        headers: {
          "apikey": cfg.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + cfg.SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        /* Keep array payload for the existing PostgREST/test contract. */
        body: JSON.stringify([row])
      }).then(function (res) {
        if (!res.ok && !isRetry && res.status >= 500) {
          setTimeout(function () { send(row, true); }, 600);
        } else if (!res.ok && cfg.ANALYTICS_DEBUG) {
          console.warn("[analytics] insert failed:", res.status);
        }
      }).catch(function () {
        if (!isRetry) setTimeout(function () { send(row, true); }, 600);
        else if (cfg.ANALYTICS_DEBUG) console.warn("[analytics] insert failed (network)");
      });
    } catch (e) {
      if (cfg.ANALYTICS_DEBUG) console.warn("[analytics] send error");
    }
  }

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
        app_version: window.DATA_MATTERS_APP_VERSION || cfg.APP_VERSION || "v1",
        device_type: deviceType(),
        referrer_domain: REFERRER || undefined,
        utm_source: UTM.utm_source,
        utm_medium: UTM.utm_medium,
        utm_campaign: UTM.utm_campaign,
        properties: clean.props
        /* occurred_at intentionally omitted; DB default now() owns server time. */
      };

      Object.keys(clean.cols).forEach(function (key) { row[key] = clean.cols[key]; });
      Object.keys(row).forEach(function (key) {
        if (row[key] === undefined) delete row[key];
      });

      if (cfg.ANALYTICS_DEBUG) console.log("[analytics]", eventName, row);
      send(row, false);
    } catch (e) {
      /* Analytics must never block the product. */
    }
  }

  function trackOncePerSession(arg1, arg2, arg3) {
    /* Existing form: (eventName, payload). Also supports (key, eventName, payload). */
    var key = arg3 === undefined ? arg1 : arg1;
    var eventName = arg3 === undefined ? arg1 : arg2;
    var payload = arg3 === undefined ? arg2 : arg3;
    if (oncePerSession(key)) track(eventName, payload);
  }

  function trackOncePerRun(runKey, eventName, payload) {
    if (firedOnce[runKey]) return;
    firedOnce[runKey] = true;
    track(eventName, payload);
  }

  function resetRunGuards(prefix) {
    Object.keys(firedOnce).forEach(function (key) {
      if (!prefix || key.indexOf(prefix) === 0) delete firedOnce[key];
    });
  }

  window.DMAnalytics = {
    track: track,
    trackOncePerSession: trackOncePerSession,
    trackOncePerRun: trackOncePerRun,
    resetRunGuards: resetRunGuards,
    resetRun: function () { resetRunGuards(""); },
    sessionId: sessionId,
    env: ENV,
    environment: ENV,
    enabled: sendAllowed,
    _allowedEvents: ALLOWED_EVENTS.slice()
  };
})();
