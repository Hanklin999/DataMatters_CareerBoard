/* Data Matters v3 — product/UX layer built on the existing taxonomy, scoring and data. */
(() => {
  "use strict";

  const APP_VERSION = (window.ANALYTICS_CONFIG && window.ANALYTICS_CONFIG.APP_VERSION) || "v3";
  const SCORING_VERSION = (window.ANALYTICS_CONFIG && window.ANALYTICS_CONFIG.SCORING_VERSION) || "v2";
  const questionSeenAt = new Map();
  const sliderTimers = new Map();
  let sharedReferral = false;
  let sharedQuizStarted = false;

  function safeTrack(name, properties){
    try { track(name, Object.assign({ app_version: APP_VERSION }, properties || {})); } catch (_) {}
  }

  const Toast = {
    show(message){
      const el = document.getElementById("toast");
      if (!el) return;
      el.textContent = message;
      el.classList.add("show");
      clearTimeout(Toast.timer);
      Toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
    }
  };
  window.Toast = Toast;

  function escapeHTML(value){
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
  }

  function findQuestion(id){
    return Object.values(STATIONS).flat().find(q => q.id === id);
  }

  function markStationQuestions(sid){
    const now = Date.now();
    (STATIONS[sid] || []).forEach(q => {
      if (!questionSeenAt.has(q.id)) questionSeenAt.set(q.id, now);
    });
  }

  /* ------------------------------------------------------------------
     Navigation and lightweight hash routing.
  ------------------------------------------------------------------ */
  Nav.show = function(id){
    const target = document.getElementById(id);
    if (!target) return;
    document.querySelectorAll("section.view").forEach(s => { s.style.display = "none"; });
    target.style.display = "block";
    const navMap = { home:"home", station1:"quiz", station2:"quiz", station3:"quiz", results:"quiz", encyclopedia:"encyclopedia", community:"community", about:"about" };
    document.querySelectorAll(".navlinks a").forEach(a => a.classList.toggle("active", a.dataset.nav === navMap[id]));
    if (["home","encyclopedia","community","about"].includes(id)) history.replaceState(null, "", id === "home" ? location.pathname + location.search : `#${id}`);
    window.scrollTo({ top:0, behavior:"smooth" });
    safeTrack("page_viewed", { page_path: id });
    if (id === "community" && window.Community) Community.load();
  };

  const baseStartQuiz = Nav.startQuiz.bind(Nav);
  Nav.startQuiz = function(entryPoint){
    if (sharedReferral){
      sharedQuizStarted = true;
      safeTrack("shared_result_quiz_started", { source_page: "shared_result" });
    }
    baseStartQuiz(entryPoint || (sharedReferral ? "shared_result" : "unknown"));
    markStationQuestions("station1");
  };

  const baseEnterStation = enterStation;
  enterStation = function(sid, direction){
    markStationQuestions(sid);
    return baseEnterStation(sid, direction);
  };

  /* ------------------------------------------------------------------
     Question-level analytics with slider debounce.
  ------------------------------------------------------------------ */
  function questionPayload(id, selected, previous, changed){
    const q = findQuestion(id);
    const seen = questionSeenAt.get(id) || Date.now();
    return {
      question_id: id,
      quiz_step: Object.entries(STATIONS).find(([, qs]) => qs.some(item => item.id === id))?.[0]?.replace("station", "") || undefined,
      selected_option: q && q.type === "single" ? `option_${Number(selected) + 1}` : Number(selected),
      response_time_ms: Math.max(0, Math.min(600000, Date.now() - seen)),
      changed_answer: Boolean(changed),
      previous_option: previous === undefined ? undefined : (q && q.type === "single" ? `option_${Number(previous) + 1}` : Number(previous)),
      role_weight_mapping_version: SCORING_VERSION
    };
  }

  const baseOnSingle = Stations.onSingle.bind(Stations);
  Stations.onSingle = function(id, idx){
    const previous = State.answers[id];
    baseOnSingle(id, idx);
    safeTrack("quiz_question_answered", questionPayload(id, idx, previous, previous !== undefined && Number(previous) !== Number(idx)));
  };

  const baseOnSlider = Stations.onSlider.bind(Stations);
  Stations.onSlider = function(id, val){
    const previous = State.answers[id];
    baseOnSlider(id, val);
    clearTimeout(sliderTimers.get(id));
    sliderTimers.set(id, setTimeout(() => {
      safeTrack("quiz_question_answered", questionPayload(id, val, previous, previous !== undefined && Number(previous) !== Number(val)));
    }, 450));
  };

  const baseSetBaseline = Stations.setBaseline.bind(Stations);
  Stations.setBaseline = function(v){
    baseSetBaseline(v);
    if (State.baselineClarity !== null) safeTrack("clarity_before_submitted", { clarity_before: State.baselineClarity });
  };

  /* ------------------------------------------------------------------
     Result IA: hero → why → common work → alternatives → profile → jobs.
  ------------------------------------------------------------------ */
  const roleDifference = {
    [F.DABI]: "更偏向解釋現況與支持決策",
    [F.DS]: "更偏向預測、實驗與模型",
    [F.MLE]: "更偏向把模型做成可用系統",
    [F.DE]: "更偏向建立穩定的資料工具",
    [F.OR]: "更偏向限制下的最佳安排",
    [F.STRAT]: "更偏向規劃、溝通與推動",
    [F.PROD]: "更偏向把需求變成產品流程",
    [F.FIN]: "更偏向金錢、風險與量化判斷",
    [F.GOV]: "更偏向品質、規則與可信度"
  };

  function compactReason(text){
    const rules = [
      [/原因/, "喜歡找出原因"], [/預測|未來/, "喜歡預測未來"], [/有限|最好|省時省錢|安排/, "享受最佳化"],
      [/自動|系統|工具/, "想建立實用工具"], [/流程|作品|上線/, "重視流程落地"], [/錯誤|風險|規則/, "在意品質風險"],
      [/程式/, "願意投入技術"], [/背後|運作/, "想理解背後原理"], [/討論|一起/, "喜歡協作討論"],
      [/專注/, "享受深度專注"], [/標準答案|摸索/, "喜歡自己找方向"], [/穩定/, "重視穩定交付"]
    ];
    const hit = rules.find(([r]) => r.test(text || ""));
    return hit ? hit[1] : String(text || "偏好這類工作").replace(/[，。]/g, "").slice(0, 12);
  }

  function compactReasons(route){
    const unique = [];
    (route.reasons || []).forEach(r => {
      const c = compactReason(r);
      if (!unique.includes(c)) unique.push(c);
    });
    return unique.slice(0, 3);
  }

  function confidenceLabel(){
    const c = State.confidence;
    if (!c || c.clarity === "Exploratory") return "還在探索";
    if (c.matchLevel === "High") return "高度相符";
    return "有幾個接近方向";
  }

  Results.scrollToJobs = function(){
    safeTrack("result_primary_cta_clicked", { role_id: ResultState.routes[0]?.famKey });
    document.getElementById("result-jobs-section")?.scrollIntoView({ behavior:"smooth", block:"start" });
  };

  Results.renderRoutes = function(){
    const [main, ...alternates] = ResultState.routes;
    if (!main) return;
    const profiles = State.careers.meta.family_profiles;
    const p = profiles[main.famKey];
    const reasons = compactReasons(main);
    const fallbackReasons = [];
    const answerReason = (id, high, low) => {
      const value = Number(State.answers[id]);
      if (!Number.isFinite(value)) return;
      const label = value >= 4 ? high : value <= 2 ? low : null;
      if (label && !fallbackReasons.includes(label)) fallbackReasons.push(label);
    };
    answerReason("coding_effort", "願意投入技術", "偏好先用現成工具");
    answerReason("deep_focus", "享受深度專注", "偏好快速互動回饋");
    answerReason("ambiguity", "喜歡自己找方向", "偏好清楚流程");
    answerReason("stable_delivery", "重視穩定交付", "偏好一次解題");
    answerReason("stakeholder_freq", "喜歡協作討論", "喜歡先獨立研究");
    fallbackReasons.forEach(reason => { if (reasons.length < 3 && !reasons.includes(reason)) reasons.push(reason); });
    while (reasons.length < 3) reasons.push(["偏好找出答案", "重視實際產出", "願意探索工作內容"][reasons.length]);

    document.getElementById("result-hero").innerHTML = `
      <section class="result-hero-v3" style="${famVars(p)}" aria-labelledby="result-role-title">
        <div class="result-hero-copy">
          <span class="eyebrow">你的探索結果</span>
          <div>你最像</div>
          <h2 id="result-role-title">${escapeHTML(p.class_title)}</h2>
          <div class="real-role">${escapeHTML(p.cn_name)}</div>
          <p class="hero-tagline">${escapeHTML(p.tagline || p.role_description)}</p>
          <ul class="hero-reasons">${reasons.map(r => `<li>${escapeHTML(r)}</li>`).join("")}</ul>
          <div class="cta-row">
            <button class="btn btn-primary" onclick="Results.scrollToJobs()">看看你可能做的工作</button>
            <button class="btn btn-ghost" onclick="ResultShare.open()">分享我的結果</button>
          </div>
          <span class="result-confidence">${confidenceLabel()}${State.confidence?.clarity === "Exploratory" ? "｜建議先廣泛探索" : ""}</span>
        </div>
        <div class="result-hero-art">${portraitHTML(p, "hero")}</div>
      </section>`;

    document.getElementById("result-why").innerHTML = `
      <section class="result-section" aria-labelledby="why-title">
        <div class="section-heading"><div><span class="eyebrow">工作偏好匹配</span><h2 id="why-title">為什麼像你？</h2></div></div>
        <div class="why-grid">${reasons.map((r, i) => `<article class="why-card"><h3>${escapeHTML(r)}</h3><p>${escapeHTML((main.reasons || [])[i] || "這個訊號來自你的工作內容偏好，不是科系或收入期待。")}</p></article>`).join("")}</div>
      </section>`;

    const titles = (p.representative_titles || []).slice(0, 3);
    const jobs = State.careers.tracks.filter(t => t.job_family === main.famKey);
    document.getElementById("result-common-work").innerHTML = `
      <section class="result-section" aria-labelledby="common-work-title">
        <div class="section-heading"><div><span class="eyebrow">先認識真實職稱</span><h2 id="common-work-title">你可能做的工作</h2></div></div>
        <div class="common-work-grid">${titles.map((title, i) => {
          const sample = jobs.find(j => j.title.includes(title)) || jobs[i] || jobs[0];
          return `<article class="common-work-card"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(sample?.what_they_do || p.role_description)}</p><button class="btn btn-ghost" onclick="Results.scrollToJobs()">查看相關職缺</button></article>`;
        }).join("")}</div>
      </section>`;

    document.getElementById("route-cards").innerHTML = `
      <section class="result-section" aria-labelledby="alternate-title">
        <div class="section-heading"><div><span class="eyebrow">技能與工作內容相近</span><h2 id="alternate-title">其他也值得探索</h2></div></div>
        <div class="alternate-grid">${alternates.map((r, i) => {
          const ap = profiles[r.famKey];
          return `<article class="alternate-card" style="${famVars(ap)}">${portraitHTML(ap, "sm")}<div><h3>${escapeHTML(ap.class_title)}</h3><div class="real-role">${escapeHTML(ap.cn_name)}</div><p class="alternate-diff">${escapeHTML(roleDifference[r.famKey])}</p></div><button class="btn btn-ghost" onclick="Results.openRoute(${i + 1})">查看方向</button></article>`;
        }).join("")}</div>
      </section>`;

    document.getElementById("compare-entry").innerHTML = `<div class="compare-entry"><div><h3>還分不清兩個角色？</h3><p>把每天做什麼、技術投入與常見產出放在一起看。</p></div><button class="btn btn-ghost" onclick="RoleCompare.open('${escapeHTML(main.famKey)}')">比較兩個角色</button></div>`;

    requestAnimationFrame(() => safeTrack("result_hero_viewed", { role_id: main.famKey, match_level: State.confidence?.matchLevel, result_clarity: State.confidence?.clarity }));
  };

  Results.renderProfile = function(){
    const main = ResultState.routes[0];
    if (!main){ document.getElementById("profile-summary").innerHTML = ""; return; }
    const p = State.careers.meta.family_profiles[main.famKey];
    const tags = profileTags();
    const techAvg = ((State.answers.coding_effort ?? 3) + (State.answers.algorithm_effort ?? 3)) / 2;
    const techLabel = techAvg >= 4 ? "較多" : techAvg <= 2.5 ? "較少" : "中等";
    const techBars = techAvg >= 4 ? 3 : techAvg <= 2.5 ? 1 : 2;
    const gaps = main.background?.gaps?.slice(0, 2) || [];
    const advantages = main.background?.advantages?.slice(0, 2) || [];
    const low = State.confidence?.clarity === "Exploratory" ? `<div class="low-confidence-banner">你的回答目前沒有集中在單一路線。可以先從資料分析、商業分析或產品分析等泛用方向開始探索。</div>` : "";
    document.getElementById("profile-summary").innerHTML = `
      ${low}
      <details class="profile-accordion" id="result-profile-accordion">
        <summary><span><strong>查看完整職涯輪廓</strong><small style="display:block;color:var(--sub);font-weight:400">了解你的工作偏好與技術投入。</small></span></summary>
        <div class="profile-accordion-body">
          <div class="profile-mini-grid">
            <article class="profile-mini-card"><h3>你的工作重心</h3><ul>${(p.daily_tasks || []).slice(0, 3).map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul></article>
            <article class="profile-mini-card"><h3>你的偏好</h3><ul>${tags.slice(0, 4).map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul></article>
            <article class="profile-mini-card"><h3>你的技術投入：${techLabel}</h3><div class="tech-meter" aria-label="技術投入 ${techLabel}">${[1,2,3].map(i => `<span class="${i <= techBars ? "on" : ""}"></span>`).join("")}</div><p class="detail-note">${advantages.length ? `目前優勢：${advantages.map(d => BACKGROUND_DIMS[d]).join("、")}` : "目前起點不決定適合度。"}</p>${gaps.length ? `<p class="detail-note">可補強：${gaps.map(g => BACKGROUND_DIMS[g.dim]).join("、")}</p>` : ""}</article>
          </div>
        </div>
      </details>`;
    setTimeout(() => {
      const d = document.getElementById("result-profile-accordion");
      if (d && !d.dataset.bound){
        d.dataset.bound = "1";
        d.addEventListener("toggle", () => safeTrack(d.open ? "result_profile_expanded" : "result_profile_collapsed", { role_id: main.famKey }));
      }
    }, 0);
  };

  Results.renderNext30 = function(){
    const main = ResultState.routes[0];
    if (!main) return;
    const p = State.careers.meta.family_profiles[main.famKey];
    document.getElementById("next30").innerHTML = `<section class="result-section"><div class="section-heading"><div><span class="eyebrow">採取下一步</span><h2>接下來可以做</h2></div></div><div class="why-grid"><article class="why-card"><h3>讀 5 份職缺</h3><p>記下重複出現的技能與工作內容。</p></article><article class="why-card"><h3>做一個小作品</h3><p>${escapeHTML(p.starter_portfolio)}</p></article><article class="why-card"><h3>找一位前輩聊聊</h3><p>用 20 分鐘確認真實工作是否符合想像。</p></article></div></section>`;
  };

  Results.renderEnvProfile = function(){
    const lines = environmentLines();
    const main = ResultState.routes[0];
    const tradeoffs = main ? environmentTradeoffs(main.famKey) : [];
    document.getElementById("env-profile").innerHTML = `<details class="profile-accordion"><summary><span><strong>工作環境偏好</strong><small style="display:block;color:var(--sub);font-weight:400">不影響職涯角色排名。</small></span></summary><div class="profile-accordion-body">${lines.length ? `<ul class="detail-list">${lines.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>` : "<p>目前沒有特別強烈的環境偏好。</p>"}${tradeoffs.length ? `<h3>可能的取捨</h3><ul class="detail-list">${tradeoffs.map(x => `<li>${escapeHTML(x)}</li>`).join("")}</ul>` : ""}</div></details>`;
  };

  Results.renderRouteFilter = function(){
    if (ResultState.selectedRoute === null) ResultState.selectedRoute = 0;
    const profiles = State.careers.meta.family_profiles;
    document.getElementById("route-filter-chips").innerHTML = ResultState.routes.map((r, i) => `<button class="tag route-filter-chip ${ResultState.selectedRoute === i ? "selected" : ""}" onclick="Results.selectRoute(${i})">${i === 0 ? "最接近你" : i === 1 ? "也值得探索" : "延伸方向"}｜${escapeHTML(profiles[r.famKey].cn_name)}</button>`).join("");
  };

  Results.selectRoute = function(i){
    ResultState.selectedRoute = i;
    ResultState.selectedDomain = null;
    Results.renderRouteFilter(); Results.renderDomainFilter(); Results.renderJobs();
    if (i > 0) {
      const payload={ role_id: ResultState.routes[i]?.famKey, recommendation_rank: i + 1 };
      safeTrack("alternate_role_opened", payload);
      safeTrack("result_alternate_role_opened", payload);
    }
  };

  Results.renderDomainFilter = function(){
    const el = document.getElementById("result-domain-chips");
    const route = ResultState.routes[ResultState.selectedRoute ?? 0];
    if (!route){ el.innerHTML = ""; return; }
    const domains = [...new Set(State.careers.tracks.filter(t => t.job_family === route.famKey).map(t => t.domain))].slice(0, 6);
    el.innerHTML = `<button class="tag domain-chip ${ResultState.selectedDomain === null ? "selected" : ""}" onclick="Results.selectDomain(null)">全部領域</button>${domains.map(d => `<button class="tag domain-chip ${ResultState.selectedDomain === d ? "selected" : ""}" onclick="Results.selectDomain('${String(d).replace(/'/g,"\\'")}')">${escapeHTML(d)}</button>`).join("")}`;
  };

  Results.selectDomain = function(d){
    ResultState.selectedDomain = d || null;
    const route = ResultState.routes[ResultState.selectedRoute ?? 0];
    safeTrack("domain_selected", { domain_id: d || "all", role_id: route?.famKey, selection_action:"select" });
    Results.renderDomainFilter(); Results.renderJobs();
  };

  const originalJobCardHTML = jobCardHTML;
  jobCardHTML = function(t, ctx, listPos){
    const fp = State.careers.meta.family_profiles[t.job_family];
    const skills = (t.related_skills || []).slice(0, 4);
    const level = String(t.technical_level || "");
    const studentFit = /T1|T2|T3/.test(level) ? "學生可先了解" : "可作為進階目標";
    return `<article class="job-card" style="${fp ? famVars(fp) : ""}"><h4>${escapeHTML(t.title)}</h4><div class="companies">${escapeHTML(t.company)} · ${escapeHTML(t.region)}</div><p class="result-desc">${escapeHTML(t.what_they_do)}</p><span class="student-fit">${studentFit}</span><details><summary>技能與其他資訊</summary><p>${skills.length ? escapeHTML(skills.join("、")) : "請以來源職缺為準。"}</p><p>${escapeHTML(t.domain)} · ${escapeHTML(t.industry)} · ${escapeHTML(level)}</p></details><a class="source-link" href="${escapeHTML(t.source_url)}" target="_blank" rel="noopener noreferrer" onclick="trackExternalJob('${escapeHTML(t.id)}', ${listPos ?? "null"})">查看職缺來源 →</a></article>`;
  };

  const baseTrackExternalJob = trackExternalJob;
  trackExternalJob = function(jobId, listPos){
    const t = State.careers?.tracks?.find(x => x.id === jobId);
    safeTrack("job_opened", { job_id:jobId, role_id:t?.job_family, domain_id:t?.domain, company_name:t?.company, list_position:listPos });
    safeTrack("result_job_card_clicked", { job_id:jobId, role_id:t?.job_family, domain_id:t?.domain, list_position:listPos });
    return baseTrackExternalJob(jobId, listPos);
  };

  Results.renderJobs = function(){
    const hint = document.getElementById("result-jobs-hint");
    const el = document.getElementById("result-jobs");
    const route = ResultState.routes[ResultState.selectedRoute ?? 0];
    if (!route){ hint.textContent = "目前沒有可顯示的職缺。"; el.innerHTML = ""; return; }
    let matches = State.careers.tracks.filter(t => t.job_family === route.famKey && (!ResultState.selectedDomain || t.domain === ResultState.selectedDomain));
    matches = matches.slice(0, 6);
    hint.textContent = matches.length ? `顯示 ${matches.length} 筆可查證來源的職缺。` : "這個方向目前沒有收錄職缺，請換個領域看看。";
    el.innerHTML = matches.map((t, i) => jobCardHTML(t, { routes:ResultState.routes }, i + 1)).join("");
  };

  const baseOpenRoute = Results.openRoute.bind(Results);
  Results.openRoute = function(i){
    if (i > 0) {
      const payload={ role_id:ResultState.routes[i]?.famKey, recommendation_rank:i + 1 };
      safeTrack("alternate_role_opened", payload);
      safeTrack("result_alternate_role_opened", payload);
    }
    return baseOpenRoute(i);
  };

  Results.renderFeedback = function(){
    const el = document.getElementById("result-feedback");
    if (!el) return;
    const fb = ResultState.feedback;
    if (fb.submitted){ el.innerHTML = `<div class="about-card"><strong>謝謝你的回饋。</strong><p>這會用來改善題目與閱讀體驗。</p></div>`; return; }
    const scale = (key, val) => [1,2,3,4,5].map(v => `<button type="button" class="baseline-btn ${val === v ? "selected" : ""}" onclick="Results.setFeedback('${key}',${v})">${v}</button>`).join("");
    el.innerHTML = `<section class="result-section"><div class="section-heading"><div><span class="eyebrow">選填</span><h2>看完後，你更清楚了嗎？</h2><p>不會影響結果，也不需要留下個人資料。</p></div></div><div class="about-card"><div class="fb-row"><div class="fb-q">看完後，你現在有多清楚不同資料工作的差別？<span class="fb-scale-hint">1 完全不清楚 → 5 非常清楚</span></div><div class="fb-scale">${scale("after", fb.after)}</div></div><div class="fb-row"><div class="fb-q">這次結果符合你的感覺嗎？<span class="fb-scale-hint">1 完全不符合 → 5 非常符合</span></div><div class="fb-scale">${scale("acc", fb.acc)}</div></div><div class="cta-row" style="justify-content:flex-start;margin-top:16px"><button class="btn btn-primary" onclick="Results.submitFeedback()">送出回饋</button><button class="btn btn-ghost" onclick="document.getElementById('result-feedback').innerHTML=''">略過</button></div><div id="fb-msg" class="field-error"></div></div></section>`;
  };

  Results.submitFeedback = function(){
    const fb = ResultState.feedback;
    if (fb.after === null && fb.acc === null){ document.getElementById("fb-msg").textContent = "至少選一項再送出。"; return; }
    const top = ResultState.routes[0]?.famKey;
    if (fb.after !== null) safeTrack("clarity_after_submitted", { clarity_before:State.baselineClarity, clarity_after:fb.after, clarity_lift:State.baselineClarity == null ? undefined : fb.after - State.baselineClarity, role_id:top });
    if (fb.acc !== null) safeTrack("accuracy_rating_submitted", { accuracy_rating:fb.acc, role_id:top });
    safeTrack("result_feedback_submitted", { clarity_before:State.baselineClarity, clarity_after:fb.after, accuracy_rating:fb.acc, role_id:top });
    fb.submitted = true;
    Results.renderFeedback();
  };

  const baseCompute = Results.compute.bind(Results);
  Results.compute = function(){
    baseCompute();
    if (sharedQuizStarted) safeTrack("shared_result_quiz_completed", { role_id:ResultState.routes[0]?.famKey });
  };

  /* ------------------------------------------------------------------
     Work-focus map with explicit, non-overlapping positions.
  ------------------------------------------------------------------ */
  const MAP_POSITIONS = {
    [F.STRAT]: { x:22, y:18 }, [F.FIN]: { x:18, y:38 }, [F.GOV]: { x:55, y:18 },
    [F.PROD]: { x:76, y:28 }, [F.OR]: { x:43, y:48 }, [F.DE]: { x:76, y:52 },
    [F.DABI]: { x:22, y:72 }, [F.DS]: { x:45, y:70 }, [F.MLE]: { x:80, y:78 }
  };
  Encyclopedia.renderMap = function(){
    const profiles = State.careers.meta.family_profiles;
    document.getElementById("spectrum-plot").innerHTML = Object.entries(profiles).map(([famKey,p]) => {
      const pos = MAP_POSITIONS[famKey] || {x:50,y:50};
      return `<button type="button" class="map-node" style="left:${pos.x}%;top:${pos.y}%;background:none;border:0;color:inherit" title="${escapeHTML(p.class_title)}｜${escapeHTML(p.cn_name)}" onclick="Encyclopedia.openFamily('${String(famKey).replace(/'/g,"\\'")}')">${iconDotHTML(p)}<span class="map-label">${escapeHTML(p.cn_name)}</span></button>`;
    }).join("");
  };

  /* ------------------------------------------------------------------
     Accessible role comparison.
  ------------------------------------------------------------------ */
  const collaboration = {
    [F.DABI]:"業務、產品、營運", [F.DS]:"產品、工程、研究", [F.MLE]:"軟體、資料與產品工程",
    [F.DE]:"分析師、資料科學家、平台工程", [F.OR]:"營運、供應鏈、規劃", [F.STRAT]:"主管、營運與跨部門團隊",
    [F.PROD]:"使用者、設計、工程、營運", [F.FIN]:"財務、風控、投資與管理層", [F.GOV]:"法遵、資安、資料擁有者"
  };
  const outputs = {
    [F.DABI]:"分析報告、儀表板、指標", [F.DS]:"模型、實驗結果、預測", [F.MLE]:"可上線的 AI 功能與模型服務",
    [F.DE]:"資料表、資料流程、共用平台", [F.OR]:"最佳方案、排程與資源配置", [F.STRAT]:"建議、計畫與推動方案",
    [F.PROD]:"需求、流程與上線功能", [F.FIN]:"風險評估、估值與決策模型", [F.GOV]:"資料標準、品質規則與控管"
  };
  const satisfaction = {
    [F.DABI]:"把複雜現況講清楚", [F.DS]:"驗證假設並提升預測", [F.MLE]:"讓模型真的被使用",
    [F.DE]:"讓資料穩定、自動地運作", [F.OR]:"在限制下找到更好的安排", [F.STRAT]:"讓團隊做出一致決定",
    [F.PROD]:"把模糊需求變成可用成果", [F.FIN]:"把不確定性變成可管理風險", [F.GOV]:"讓資料可信、可追溯"
  };
  const confusion = {
    [F.DABI]:"不是只做圖表；核心是回答決策問題。", [F.DS]:"不是所有工作都在做深度學習。", [F.MLE]:"更接近軟體工程，不只是訓練模型。",
    [F.DE]:"主要服務資料使用者，不是一般後端開發。", [F.OR]:"重點是最佳化，不只是預測。", [F.STRAT]:"不只做簡報，也要定義問題與推動落地。",
    [F.PROD]:"不等於產品經理；更聚焦系統與資料需求。", [F.FIN]:"不只看報表，也可能需要統計與程式。", [F.GOV]:"不是單純行政，而是建立可信資料規則。"
  };

  const RoleCompare = {
    open(firstFam){
      const keys = Object.keys(State.careers.meta.family_profiles);
      const a = firstFam && keys.includes(firstFam) ? firstFam : keys[0];
      const b = keys.find(k => k !== a) || keys[1];
      safeTrack("role_compare_started", { role_id:a });
      Modal.open(`<div id="role-compare-root"></div>`);
      RoleCompare.render(a,b);
    },
    render(a,b){
      const profiles = State.careers.meta.family_profiles;
      const keys = Object.keys(profiles);
      const options = selected => keys.map(k => `<option value="${escapeHTML(k)}" ${k===selected?"selected":""}>${escapeHTML(profiles[k].cn_name)}</option>`).join("");
      const col = fam => {
        const p = profiles[fam];
        const tech = p.technical_stars >= 4 ? "較多" : p.technical_stars <= 2 ? "較少" : "中等";
        const rows = [
          ["每天主要做什麼", (p.daily_tasks||[]).slice(0,2).join("；")], ["常見產出", outputs[fam]], ["技術投入", tech],
          ["常合作的人", collaboration[fam]], ["常見職稱", (p.representative_titles||[]).slice(0,3).join("、")],
          ["適合的成就感", satisfaction[fam]], ["最容易混淆", confusion[fam]]
        ];
        return `<section class="compare-column" style="${famVars(p)}">${portraitHTML(p,"sm")}<h2>${escapeHTML(p.cn_name)}</h2><div class="rpg-badge">${escapeHTML(p.class_title)}</div>${rows.map(([label,value]) => `<div class="compare-row"><span class="compare-label">${label}</span><span>${escapeHTML(value||"—")}</span></div>`).join("")}</section>`;
      };
      document.getElementById("role-compare-root").innerHTML = `<div class="role-compare"><div class="compare-selects"><label>角色一<select onchange="RoleCompare.change(0,this.value)">${options(a)}</select></label><label>角色二<select onchange="RoleCompare.change(1,this.value)">${options(b)}</select></label></div>${col(a)}${col(b)}<div class="compare-actions"><button class="btn btn-primary" onclick="RoleCompare.complete('${escapeHTML(a)}','${escapeHTML(b)}')">完成比較</button><button class="btn btn-ghost" onclick="RoleCompare.openRole('${escapeHTML(a)}')">查看角色一詳情</button><button class="btn btn-ghost" onclick="RoleCompare.jobs('${escapeHTML(a)}')">查看相關職缺</button></div></div>`;
      RoleCompare.current = [a,b];
    },
    change(index,value){ const next = [...RoleCompare.current]; next[index]=value; if(next[0]===next[1]) next[1-index]=Object.keys(State.careers.meta.family_profiles).find(k=>k!==value); RoleCompare.render(next[0],next[1]); },
    complete(a,b){ safeTrack("role_compare_completed", { role_id:a, compared_role_id:b }); Toast.show("已完成角色比較"); },
    openRole(fam){ Modal.open(familyDetailHTML(fam)); },
    jobs(fam){
      safeTrack("role_compare_job_opened", { role_id:fam });
      const i=ResultState.routes.findIndex(r=>r.famKey===fam);
      if(i>=0){ Modal.close(); Nav.show("results"); Results.selectRoute(i); Results.scrollToJobs(); return; }
      const p=State.careers.meta.family_profiles[fam];
      const jobs=(State.careers.tracks||[]).filter(t=>t.job_family===fam).slice(0,6);
      Modal.open(`<div class="modal-job-list"><h2>${escapeHTML(p?.cn_name||"相關職缺")}</h2><p>先用常見職稱理解這個方向。</p>${jobs.length?jobs.map(t=>`<article class="job-card-v3"><h3>${escapeHTML(t.role_title||t.title||"職缺")}</h3><p>${escapeHTML(t.role_description||t.description||"")}</p></article>`).join(""):`<div class="empty-state">目前沒有可顯示的職缺資料。</div>`}</div>`);
    }
  };
  window.RoleCompare = RoleCompare;

  /* ------------------------------------------------------------------
     Instagram Story image (Canvas + QR library) and Web Share fallback.
  ------------------------------------------------------------------ */
  function loadImage(src){
    return new Promise((resolve,reject) => { const img=new Image(); img.onload=()=>resolve(img); img.onerror=reject; img.src=src; });
  }
  function roundedRect(ctx,x,y,w,h,r){
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }
  function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines){
    const chars=[...String(text||"")]; let line="",lines=[];
    chars.forEach(ch=>{ const test=line+ch; if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=ch}else line=test; }); if(line) lines.push(line);
    lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
  }
  function roleImagePath(p){ return p.card_image || `images/${slugify(p.class_title_en)}.jpg`; }

  const ResultShare = {
    dataUrl:null, file:null, referralUrl:null,
    async open(){
      const main=ResultState.routes[0]; if(!main) return;
      safeTrack("result_share_clicked", { role_id:main.famKey });
      safeTrack("share_preview_opened", { role_id:main.famKey });
      Modal.open(`<div class="share-preview"><div id="share-image-wrap" class="loading-state">正在產生分享圖片…</div><div class="share-actions"><h2>分享探索結果</h2><p>會產生 1080 × 1920 的限時動態圖片。</p><button class="btn btn-primary" id="native-share-btn" onclick="ResultShare.nativeShare()" disabled>分享圖片</button><button class="btn btn-ghost" id="download-share-btn" onclick="ResultShare.download()" disabled>下載圖片</button><button class="btn btn-ghost" id="copy-share-btn" onclick="ResultShare.copyLink()">複製分享連結</button><p id="share-status" class="share-status">純網頁無法保證直接發布到 Instagram Stories。</p></div></div>`);
      try{
        safeTrack("share_image_generation_started", { role_id:main.famKey });
        const output=await ResultShare.generate();
        document.getElementById("share-image-wrap").innerHTML=`<img src="${output.dataUrl}" alt="${escapeHTML(output.alt)}">`;
        ["native-share-btn","download-share-btn"].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=false;});
        safeTrack("share_image_generated", { role_id:main.famKey });
      }catch(err){
        document.getElementById("share-image-wrap").innerHTML=`<div class="error-state">圖片產生失敗，仍可複製分享連結。</div>`;
        safeTrack("share_image_generation_failed", { role_id:main.famKey, error_type:String(err.name||"error").slice(0,40) });
      }
    },
    async generate(){
      const main=ResultState.routes[0]; const p=State.careers.meta.family_profiles[main.famKey];
      if(document.fonts?.ready) await document.fonts.ready;
      if(typeof window.qrcode!=="function") throw new Error("QR Code 元件尚未載入");
      const canvas=document.createElement("canvas"); canvas.width=1080; canvas.height=1920; const ctx=canvas.getContext("2d");
      const referral=new URL(location.origin+location.pathname); referral.searchParams.set("utm_source","instagram"); referral.searchParams.set("utm_medium","story"); referral.searchParams.set("utm_campaign","result_share"); referral.searchParams.set("utm_content",slugify(p.class_title_en));
      ResultShare.referralUrl=referral.toString();
      const grad=ctx.createLinearGradient(0,0,1080,1920); grad.addColorStop(0,p.color||"#172033"); grad.addColorStop(.58,"#10152a"); grad.addColorStop(1,"#090c16"); ctx.fillStyle=grad;ctx.fillRect(0,0,1080,1920);
      ctx.fillStyle="rgba(255,255,255,.05)";ctx.beginPath();ctx.arc(900,370,430,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(150,1550,360,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#f0ecdd";ctx.font="700 34px 'Noto Sans TC', sans-serif";ctx.fillText("DATA MATTERS",90,220);
      ctx.fillStyle="#b7bfd9";ctx.font="500 34px 'Noto Sans TC', sans-serif";ctx.fillText("我的資料職涯角色是",90,340);
      ctx.fillStyle="#ffffff";ctx.font="900 82px 'Noto Sans TC', sans-serif";drawWrapped(ctx,p.class_title,90,455,900,96,2);
      ctx.fillStyle=p.glow||"#d4af37";ctx.font="700 42px 'Noto Sans TC', sans-serif";ctx.fillText(p.cn_name,90,650);
      const img=await loadImage(roleImagePath(p)); const size=650,x=215,y=735;ctx.save();roundedRect(ctx,x,y,size,size,56);ctx.clip();const scale=Math.max(size/img.width,size/img.height);const sw=size/scale,sh=size/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;ctx.drawImage(img,sx,sy,sw,sh,x,y,size,size);ctx.restore();
      ctx.fillStyle="#f0ecdd";ctx.font="600 32px 'Noto Sans TC', sans-serif";drawWrapped(ctx,p.tagline||p.role_description,90,1485,900,46,2);
      const tags=compactReasons(main);ctx.font="600 27px 'Noto Sans TC', sans-serif";let tx=90;tags.forEach(tag=>{const w=ctx.measureText(tag).width+48;ctx.fillStyle="rgba(255,255,255,.10)";roundedRect(ctx,tx,1595,w,58,29);ctx.fill();ctx.fillStyle="#f0ecdd";ctx.fillText(tag,tx+24,1634);tx+=w+14;});
      ctx.fillStyle="#f0ecdd";ctx.font="700 30px 'Noto Sans TC', sans-serif";ctx.fillText("你是哪一種資料職涯角色？",90,1775);ctx.fillStyle="#9aa3c4";ctx.font="500 23px 'Noto Sans TC', sans-serif";ctx.fillText(location.host,90,1822);
      const qr=window.qrcode(0,"M");qr.addData(ResultShare.referralUrl);qr.make();const modules=qr.getModuleCount(),qrSize=190,cell=qrSize/modules,qx=800,qy=1680;ctx.fillStyle="#ffffff";ctx.fillRect(qx-14,qy-14,qrSize+28,qrSize+28);ctx.fillStyle="#111111";for(let r=0;r<modules;r++)for(let c=0;c<modules;c++)if(qr.isDark(r,c))ctx.fillRect(qx+c*cell,qy+r*cell,Math.ceil(cell),Math.ceil(cell));
      ResultShare.dataUrl=canvas.toDataURL("image/png"); const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png")); ResultShare.file=new File([blob],`data-matters-${slugify(p.class_title_en)}-story.png`,{type:"image/png"});
      return {dataUrl:ResultShare.dataUrl,alt:`我的資料職涯角色是${p.class_title}，${p.cn_name}`};
    },
    async nativeShare(){
      const main=ResultState.routes[0]; if(!ResultShare.file) return;
      safeTrack("share_native_started", { role_id:main?.famKey });
      const payload={files:[ResultShare.file],title:"Data Matters 探索結果",text:`我測出來是「${State.careers.meta.family_profiles[main.famKey].class_title}」，你是哪一種資料職涯角色？`,url:ResultShare.referralUrl};
      try{
        if(navigator.share && navigator.canShare && navigator.canShare({files:payload.files})){await navigator.share(payload);safeTrack("share_native_completed",{role_id:main.famKey});}
        else{ResultShare.download();await ResultShare.copyLink();Toast.show("圖片已儲存，網站連結也已複製。打開 Instagram 後加入限時動態即可。");}
      }catch(err){if(err.name==="AbortError")safeTrack("share_native_cancelled",{role_id:main.famKey});else{safeTrack("share_image_generation_failed",{role_id:main.famKey,error_type:"native_share"});Toast.show("分享未完成，請改用下載圖片。");}}
    },
    download(){ if(!ResultShare.dataUrl)return;const a=document.createElement("a");a.href=ResultShare.dataUrl;a.download=ResultShare.file?.name||"data-matters-story.png";a.click();safeTrack("share_image_downloaded",{role_id:ResultState.routes[0]?.famKey}); },
    async copyLink(){
      const url=ResultShare.referralUrl||location.href;
      try{await navigator.clipboard.writeText(url);Toast.show("分享連結已複製");safeTrack("share_link_copied",{role_id:ResultState.routes[0]?.famKey});return true;}catch(_){const ta=document.createElement("textarea");ta.value=url;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();Toast.show("分享連結已複製");safeTrack("share_link_copied",{role_id:ResultState.routes[0]?.famKey});return true;}
    }
  };
  window.ResultShare=ResultShare;

  /* ------------------------------------------------------------------
     Modal focus trap and clean close behavior.
  ------------------------------------------------------------------ */
  let modalKeyHandler=null;
  Modal.open=function(html){
    Modal._lastFocus=document.activeElement;
    document.getElementById("modal-body").innerHTML=html;
    const overlay=document.getElementById("modal-overlay");overlay.style.display="flex";document.body.style.overflow="hidden";
    modalKeyHandler=e=>{
      if(e.key==="Escape"){Modal.close();return;}
      if(e.key!=="Tab")return;
      const items=[...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
      if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    };
    document.addEventListener("keydown",modalKeyHandler);
    setTimeout(()=>overlay.querySelector(".modal-close")?.focus(),0);
  };
  Modal.close=function(){
    document.getElementById("modal-overlay").style.display="none";document.body.style.overflow="";
    if(modalKeyHandler)document.removeEventListener("keydown",modalKeyHandler);modalKeyHandler=null;
    Modal._lastFocus?.focus?.();
  };

  /* ------------------------------------------------------------------
     Referral and initial route.
  ------------------------------------------------------------------ */
  const params=new URLSearchParams(location.search);
  sharedReferral=params.get("utm_campaign")==="result_share";
  if(sharedReferral) safeTrack("shared_result_landed", { role_id:params.get("utm_content")||undefined, utm_source:params.get("utm_source"), utm_medium:params.get("utm_medium") });

  window.addEventListener("load",()=>{
    const route=location.hash.replace("#","");
    if(["encyclopedia","community","about"].includes(route)) Nav.show(route);
    setTimeout(()=>{
      const observerTarget=document.getElementById("result-hero");
      if(observerTarget&&window.IntersectionObserver){
        const obs=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&ResultState.routes[0]){safeTrack("result_hero_viewed",{role_id:ResultState.routes[0].famKey});obs.disconnect();}},{threshold:.45});obs.observe(observerTarget);
      }
    },500);
  });
})();
