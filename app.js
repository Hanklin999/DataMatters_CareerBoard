/* ==========================================================================
   資料科學分析地圖 | Data Matters — 判定演算法 v2
   配對計算在瀏覽器端完成；匿名操作事件與留言板由獨立模組處理。

   三分數系統：
   - preferenceScores：工作內容偏好 → 決定 Job Family 排名（唯一來源）
   - backgroundScores：目前起點與入門優勢 → 只用於優勢/差距/挑戰路線
   - environmentScores：理想工作環境 → 只用於環境摘要與產業推薦，
     「不得」影響 Job Family 排名
   ========================================================================== */

const State = {
  careers: null,
  skills: null,
  preferenceScores: {},   // family -> score（工作內容偏好，決定排名）
  backgroundScores: {},   // dimension -> 0-5（科系推導的起點）
  environmentScores: {},  // env dimension -> 1-5（環境偏好）
  industryScores: {},
  domainScores: {},
  contrib: {},            // family -> [{qid, amount, dir}] 只收 preference 題，供推薦理由
  confidence: null,       // {score, matchLevel, clarity, triggers, lowConfidence}
  answers: {}
};

const FAMILIES = [
  "Data Science & Applied Modeling",
  "Machine Learning & AI Engineering",
  "Data Analytics & Business Intelligence",
  "Data Engineering & Analytics Engineering",
  "Operations Research & Decision Optimization",
  "Strategy, Operations & Consulting",
  "Product, Systems & Solutions",
  "Finance, Risk & Quantitative Analytics",
  "Data Governance, Quality & Responsible Data"
];

// 縮寫（config 內少打全名）
const F = {
  DS: "Data Science & Applied Modeling",
  MLE: "Machine Learning & AI Engineering",
  DABI: "Data Analytics & Business Intelligence",
  DE: "Data Engineering & Analytics Engineering",
  OR: "Operations Research & Decision Optimization",
  STRAT: "Strategy, Operations & Consulting",
  PROD: "Product, Systems & Solutions",
  FIN: "Finance, Risk & Quantitative Analytics",
  GOV: "Data Governance, Quality & Responsible Data"
};

const BACKGROUND_DIMS = {
  coding: "程式能力",
  math_stats: "統計與數學",
  business_domain: "商業與領域知識",
  software_eng: "軟體工程基礎"
};

/* 每個 Job Family 常見的入門起點（0–5，主觀參考值），
   用於入門優勢/差距與挑戰路線的 background gap 計算 */
const BACKGROUND_REQUIREMENTS = {
  [F.STRAT]: { coding: 1, math_stats: 1, business_domain: 4, software_eng: 0 },
  [F.FIN]:   { coding: 3, math_stats: 4, business_domain: 3, software_eng: 1 },
  [F.PROD]:  { coding: 2, math_stats: 2, business_domain: 3, software_eng: 1 },
  [F.DABI]:  { coding: 2, math_stats: 2, business_domain: 2, software_eng: 0 },
  [F.GOV]:   { coding: 2, math_stats: 1, business_domain: 2, software_eng: 1 },
  [F.DS]:    { coding: 4, math_stats: 4, business_domain: 1, software_eng: 2 },
  [F.OR]:    { coding: 3, math_stats: 5, business_domain: 1, software_eng: 2 },
  [F.DE]:    { coding: 4, math_stats: 2, business_domain: 1, software_eng: 4 },
  [F.MLE]:   { coding: 5, math_stats: 4, business_domain: 0, software_eng: 5 }
};

/* 工作內容/技能相近的家族（鄰近選項候選池） */
const FAMILY_ADJACENCY = {
  [F.DABI]:  [F.PROD, F.STRAT, F.DS],
  [F.DS]:    [F.DABI, F.OR, F.MLE],
  [F.MLE]:   [F.DS, F.DE],
  [F.DE]:    [F.MLE, F.DABI, F.GOV],
  [F.OR]:    [F.DS, F.DE, F.STRAT],
  [F.STRAT]: [F.DABI, F.PROD, F.FIN],
  [F.PROD]:  [F.DABI, F.STRAT, F.DS],
  [F.FIN]:   [F.DS, F.DABI, F.GOV],
  [F.GOV]:   [F.DE, F.DABI, F.FIN]
};

/* 挑戰路線的 aspiration bonus 適用的技術型家族 */
const TECH_FAMILIES = new Set([F.MLE, F.DE, F.DS, F.OR]);

const ENVIRONMENT_LABELS = {
  compensation: { label: "收入期待", high: "你追求收入高上限，能接受波動", low: "你重視收入穩定" },
  prestige:     { label: "品牌與頭銜", high: "你在意品牌與頭銜", low: "你對品牌與頭銜沒有強烈偏好" },
  stability:    { label: "工作保障", high: "你偏好穩定且可預期的環境", low: "你能接受較高的不確定性" },
  worklife:     { label: "生活平衡", high: "你重視生活平衡", low: "你能為工作階段性衝刺" },
  intensity:    { label: "工作強度", high: "你能承受高壓與常態性衝刺", low: "你偏好穩定、可預期的節奏" }
};

/* 每一題屬於哪個計分系統（文件化用，測試也會驗證） */
const QUESTION_DIMENSIONS = {
  major: "background",
  coding_effort: "preference", algorithm_effort: "preference",
  problem_type: "preference", system_type: "preference", math_pref: "preference",
  work_result: "preference", output_pref: "preference", responsibility: "preference",
  stakeholder_freq: "preference", deep_focus: "preference",
  ambiguity: "preference", stable_delivery: "preference",
  income: "environment", prestige: "environment", security: "environment",
  worklife: "environment", intensity: "environment"
};

function resetState(){
  State.preferenceScores = {}; FAMILIES.forEach(f => State.preferenceScores[f] = 0);
  State.backgroundScores = { coding: 0, math_stats: 0, business_domain: 0, software_eng: 0 };
  State.environmentScores = {};
  State.industryScores = {};
  State.domainScores = {};
  State.contrib = {};
  State.confidence = null;
  State.answers = {};
  State.baselineClarity = null; // 測驗前 clarity baseline（選填，不影響配對）
}
resetState();

/* ---------------------------------------------------------------------
   匿名使用分析 hooks（analytics.js 未載入或未設定時自動略過，不影響功能）
--------------------------------------------------------------------- */
const APP_EVENTS = (window.DMAnalyticsEvents && window.DMAnalyticsEvents.EVENTS) || {};
function track(name, payload){
  if (!name) return;
  try { window.DMAnalytics && window.DMAnalytics.track(name, payload); } catch (e) {}
}
const QuizTiming = { quizStartTs: null, stepEnterTs: {}, lastStation: null, resultRun: 0 };
const STEP_NUM = { station1: 1, station2: 2, station3: 3 };

function enterStation(sid, direction){
  const step = STEP_NUM[sid];
  if (!step) return;
  QuizTiming.stepEnterTs[sid] = Date.now();
  if (QuizTiming.lastStation !== sid){ // 同站 re-render 不重複觸發
    track(APP_EVENTS.QUIZ_STEP_VIEWED, { quiz_step: step, navigation_direction: direction });
  }
  QuizTiming.lastStation = sid;
}
function stationStats(sid){
  const qs = STATIONS[sid];
  const answered = qs.filter(q => State.answers[q.id] !== undefined).length;
  const enter = QuizTiming.stepEnterTs[sid];
  let t = enter ? Math.round((Date.now() - enter) / 1000) : null;
  if (t !== null) t = Math.max(0, Math.min(1800, t)); // 上限 1800 秒、不接受負值
  return { time_spent_sec: t, answered_question_count: answered, total_question_count: qs.length };
}
function trackExternalJob(jobId, listPos){
  try {
    const t = State.careers.tracks.find(x => x.id === jobId);
    if (!t) return;
    let host = null;
    try { host = new URL(t.source_url).hostname; } catch (e) {}
    track(APP_EVENTS.EXTERNAL_JOB_CLICKED, {
      job_id: t.id, role_id: t.job_family, domain_id: t.domain, company_name: t.company,
      destination_domain: host, list_position: listPos ?? undefined
    });
  } catch (e) {} // 埋點失敗不得阻止連結開啟（連結本身照常運作）
}

/* ---------------------------------------------------------------------
   題庫 v2 — 18 題，三站
   Station 1｜你想解決什麼問題（6）
   Station 2｜你喜歡如何工作（7）
   Station 3｜你想要什麼工作環境（5，不影響 Job Family）

   slider 規則：
   - value >= 4 → high 家族 += (value-3) * weight
   - value <= 2 且 lowIsMeaningful → low 家族 += (3-value) * lowWeight
   - 「不喜歡某件事」不再自動變成其他職涯的正分
--------------------------------------------------------------------- */
const STATION1_QUESTIONS = [
  {
    id: "major", type: "single", system: "background",
    text: "你的科系最接近哪一類？",
    options: [
      { label: "統計、資管、財工等（商管學院，程式比重高）",
        background: { coding: 2, math_stats: 3, business_domain: 3, software_eng: 1 },
        industry: { "Technology": 1, "SaaS": 1 }, domain: { "Product": 1 } },
      { label: "國貿、財金、會計等（商管學院，程式比重低）",
        background: { coding: 0, math_stats: 1, business_domain: 4, software_eng: 0 },
        industry: { "Financial Services": 1, "Insurance": 1 }, domain: { "Finance": 1 } },
      { label: "電機、資工等（理工學院，程式比重高）",
        background: { coding: 4, math_stats: 3, business_domain: 0, software_eng: 4 },
        industry: { "Technology": 1, "SaaS": 1 }, domain: { "Product": 1 } },
      { label: "物理、材料、土木、生科等（理工學院，程式比重低）",
        background: { coding: 1, math_stats: 3, business_domain: 1, software_eng: 1 },
        industry: { "Manufacturing": 1, "Healthcare": 1 }, domain: { "Supply Chain": 1 } },
      { label: "非商學院、非理工學院",
        background: { coding: 0, math_stats: 0, business_domain: 2, software_eng: 0 },
        industry: { "Media": 1, "Education": 1 }, domain: { "Customer": 1 } }
    ]
  },
  {
    id: "coding_effort", type: "slider", system: "preference",
    text: "你願意花多少時間學會寫程式？",
    leftLabel: "先會用工具", rightLabel: "願意長期練習",
    high: [F.MLE, F.DE, F.DS], lowIsMeaningful: false
  },
  {
    id: "algorithm_effort", type: "slider", system: "preference",
    text: "使用一個工具時，你多想理解背後原理？",
    leftLabel: "會用就好", rightLabel: "想徹底搞懂",
    high: [F.MLE, F.OR, F.DS], lowIsMeaningful: false
  },
  {
    id: "problem_type", type: "single", system: "preference", weight: 1.5,
    text: "哪一類問題最吸引你？",
    options: [
      { label: "找出發生了什麼、為什麼", family: { [F.DABI]: 2, [F.DS]: 1 } },
      { label: "預測接下來可能發生什麼", family: { [F.DS]: 2, [F.MLE]: 1 } },
      { label: "在限制下找出最佳安排", family: { [F.OR]: 2 } },
      { label: "建立可重複使用的工具", family: { [F.DE]: 2 } },
      { label: "把需求變成流程或功能", family: { [F.PROD]: 2 } },
      { label: "找出錯誤、風險與不一致", family: { [F.GOV]: 2, [F.FIN]: 1 } }
    ]
  },
  {
    id: "system_type", type: "single", system: "preference",
    text: "如果要做一套工具，你比較想做？",
    options: [
      { label: "整理資料並自動更新", family: { [F.DE]: 2 } },
      { label: "讓模型提供推薦或答案", family: { [F.MLE]: 2 } },
      { label: "讓團隊快速看懂現況", family: { [F.DABI]: 2, [F.DE]: 1 } },
      { label: "把需求變成可用功能", family: { [F.PROD]: 2 } }
    ]
  },
  {
    id: "math_pref", type: "single", system: "preference",
    text: "哪種問題比較吸引你？",
    options: [
      { label: "預測需求、風險或行為", family: { [F.DS]: 2 } },
      { label: "在成本與時間限制下找最佳方案", family: { [F.OR]: 2 } },
      { label: "衡量某個行動是否真的有效", family: { [F.DS]: 1, [F.PROD]: 1 } },
      { label: "先把現況解釋清楚", family: { [F.DABI]: 2 } }
    ]
  }
];

const STATION2_QUESTIONS = [
  {
    id: "work_result", type: "single", system: "preference",
    text: "活動報名率很低，你比較想先做什麼？",
    options: [
      { label: "找出原因並提出建議", family: { [F.DABI]: 2 } },
      { label: "直接做出改善方案並測試", family: { [F.PROD]: 2 } },
      { label: "設計一個預測或驗證方法", family: { [F.DS]: 2 } },
      { label: "整理資料，讓之後能重複使用", family: { [F.DE]: 2 } }
    ]
  },
  {
    id: "output_pref", type: "single", system: "preference",
    text: "一個月後，你最想完成什麼？",
    options: [
      { label: "一份能幫助決策的分析", family: { [F.DABI]: 2, [F.STRAT]: 1 } },
      { label: "一個可驗證的模型或測試", family: { [F.DS]: 2 } },
      { label: "一套穩定運行的工具", family: { [F.DE]: 2, [F.MLE]: 1 } },
      { label: "一個真正上線的功能或流程", family: { [F.PROD]: 2 } },
      { label: "一套品質或風險規則", family: { [F.GOV]: 2, [F.FIN]: 1 } },
      { label: "一個更好的資源安排", family: { [F.OR]: 2 } }
    ]
  },
  {
    id: "responsibility", type: "single", system: "preference",
    text: "哪一種責任最吸引你？",
    options: [
      { label: "找出資料或流程錯誤", family: { [F.GOV]: 2 } },
      { label: "找出可能造成損失的風險", family: { [F.FIN]: 2 } },
      { label: "找到可以成長的機會", family: { [F.PROD]: 1, [F.DABI]: 1 } },
      { label: "找出流程中的浪費", family: { [F.OR]: 1, [F.STRAT]: 1 } }
    ]
  },
  {
    id: "stakeholder_freq", type: "slider", system: "preference",
    text: "事情卡住時，你多喜歡找大家確認需求？",
    leftLabel: "先自己研究", rightLabel: "找大家一起確認",
    high: { [F.STRAT]: 1, [F.PROD]: 1, [F.FIN]: 1, [F.DABI]: 0.5 },
    lowIsMeaningful: false // 低互動偏好只記錄，不自動推向 DS / Engineering
  },
  {
    id: "deep_focus", type: "slider", system: "preference",
    text: "你有多享受長時間自己研究或動手完成一件事？",
    leftLabel: "不太享受", rightLabel: "很享受",
    high: [F.DS, F.MLE, F.DE, F.OR], lowIsMeaningful: false
  },
  {
    id: "ambiguity", type: "slider", system: "preference",
    text: "遇到沒有標準答案的問題時，你會？",
    leftLabel: "希望先有清楚流程", rightLabel: "喜歡自己找方向",
    high: [F.DS, F.PROD, F.STRAT, F.OR],
    lowIsMeaningful: true, low: [F.DE, F.GOV, F.DABI], lowWeight: 0.5
  },
  {
    id: "stable_delivery", type: "slider", system: "preference",
    text: "你有多享受把事情做得穩定、可以反覆使用？",
    leftLabel: "不太在意", rightLabel: "很有成就感",
    high: [F.DE, F.GOV, F.DABI, F.MLE], lowIsMeaningful: false
  }
];

const STATION3_QUESTIONS = [
  {
    id: "income", type: "slider", system: "environment", env: "compensation",
    text: "你對收入的期待是？",
    leftLabel: "穩定夠用", rightLabel: "追求更高上限",
    industryHigh: ["Technology", "Financial Services"]
  },
  {
    id: "prestige", type: "slider", system: "environment", env: "prestige",
    text: "品牌與頭銜對你重要嗎？",
    leftLabel: "不太重要", rightLabel: "非常重要",
    industryHigh: ["Consulting", "Financial Services"]
  },
  {
    id: "security", type: "slider", system: "environment", env: "stability",
    text: "你需要多少工作保障？",
    leftLabel: "能接受變動", rightLabel: "希望高度穩定",
    industryHighAtMax: ["Government", "Education", "Insurance", "Healthcare"],
    industryHighAtMin: ["Technology"]
  },
  {
    id: "worklife", type: "slider", system: "environment", env: "worklife",
    text: "你多重視工作與生活平衡？",
    leftLabel: "可階段性衝刺", rightLabel: "生活品質很重要",
    industryHighAtMax: ["Government", "Education"],
    industryHighAtMin: ["Consulting", "Financial Services", "Technology"]
  },
  {
    id: "intensity", type: "slider", system: "environment", env: "intensity",
    text: "你能承受多高強度的工作節奏？",
    leftLabel: "穩定可預期", rightLabel: "能承受常態衝刺",
    industryHigh: ["Consulting", "Financial Services"]
  }
];

const STATIONS = {
  station1: STATION1_QUESTIONS,
  station2: STATION2_QUESTIONS,
  station3: STATION3_QUESTIONS
};

/* ---------------------------------------------------------------------
   推薦理由字典 — 只涵蓋 preference 題。
   環境（收入/名聲/穩定/平衡/強度）與科系「不得」成為推薦理由。
--------------------------------------------------------------------- */
const REASON_TEXT = {
  coding_effort:   { high: "你願意花時間練程式這種很難但很強的技能" },
  algorithm_effort:{ high: "你會想搞懂工具背後是怎麼運作的" },
  stakeholder_freq:{ high: "你喜歡和大家討論、一起做決定" },
  deep_focus:      { high: "你享受長時間專注做一件事" },
  ambiguity:       { high: "你喜歡沒有標準答案、自己摸索的問題", low: "你偏好方向明確、流程清楚的任務" },
  stable_delivery: { high: "你享受把事情做到穩定、每次都不出錯" },
  problem_type: [
    "你喜歡找出事情背後的原因",
    "你喜歡預測接下來會發生什麼",
    "你喜歡在有限資源下排出最好的安排",
    "你喜歡打造讓資料自動運作的系統",
    "你喜歡把需求變成流程和作品",
    "你擅長揪出錯誤與風險"
  ],
  system_type: [
    "你想做讓資料自動歸檔流動的幕後工具",
    "你想做會推薦、會回覆的 AI 系統",
    "你想做讓大家一看就懂的數據看板",
    "你想做支撐活動與產品運作的流程"
  ],
  math_pref: [
    "「從紀錄猜中未來」的謎題最吸引你",
    "「限制下排出最好計畫」的謎題最吸引你",
    "你在意驗證改變是不是真的有效",
    "你擅長把複雜的事解釋到大家都懂"
  ],
  work_result: [
    "你想負責找出原因並提出建議",
    "你想負責規劃流程、讓大家順利完成",
    "你想負責預測與實驗的部分",
    "你想負責整理資料、建立共用系統"
  ],
  output_pref: [
    "你想拿出一份能幫助決策的分析",
    "你想拿出一個可驗證的模型或測試",
    "你想拿出一套自動運作的系統",
    "你想拿出一個正式上線的作品",
    "你想建立一套品質或風險規則",
    "你想排出一個更好的資源安排"
  ],
  responsibility: [
    "你願意扛「確保零錯誤」的把關責任",
    "你願意扛金錢與風險評估的責任",
    "你想找出讓更多人參與、成長的機會",
    "你想讓流程更快、更省資源"
  ]
};

/* ---------------------------------------------------------------------
   六邊形「工作偏好輪廓」— 全部由 preference 題換算（1–5）
--------------------------------------------------------------------- */
const HEX_AXES = [
  { label: "商業決策", calc: a => clamp15(2 + (a.problem_type === 4 ? 1 : 0) + ((a.output_pref === 0 || a.output_pref === 3) ? 1 : 0) + (a.responsibility === 2 ? 1 : 0)) },
  { label: "資料分析", calc: a => clamp15(2 + (a.problem_type === 0 ? 1 : 0) + (a.work_result === 0 ? 1 : 0) + (a.math_pref === 3 ? 1 : 0)) },
  { label: "程式投入", calc: a => clamp15(a.coding_effort ?? 3) },
  { label: "模型研究", calc: a => clamp15((a.algorithm_effort ?? 3) + ((a.math_pref === 0 || a.math_pref === 1) ? 1 : 0) + (a.problem_type === 1 ? 1 : 0) - 1 + 1) },
  { label: "系統建構", calc: a => clamp15(2 + ((a.system_type === 0 || a.system_type === 1) ? 1 : 0) + (a.output_pref === 2 ? 1 : 0) + Math.max(0, (a.coding_effort ?? 3) - 3)) },
  { label: "跨部門協作", calc: a => clamp15(a.stakeholder_freq ?? 3) }
];
function clamp15(v){ return Math.max(1, Math.min(5, Math.round(v))); }

function deferFrame(callback){
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame(callback);
  callback();
  return 0;
}

/* ---------------------------------------------------------------------
   Navigation
--------------------------------------------------------------------- */
const Nav = {
  show(id){
    document.querySelectorAll("section.view").forEach(s => s.style.display = "none");
    document.getElementById(id).style.display = "block";
    document.querySelectorAll(".navlinks a").forEach(a => a.classList.remove("active"));
    const navMap = { home:"home", station1:"quiz", station2:"quiz", station3:"quiz", results:"quiz", encyclopedia:"encyclopedia", about:"about" };
    const navId = navMap[id] || id;
    const link = document.querySelector('.navlinks a[data-nav="'+navId+'"]');
    if (link) link.classList.add("active");
    window.scrollTo({top:0, behavior:"smooth"});
    if (id === "encyclopedia") {
      deferFrame(() => deferFrame(() => Encyclopedia.refreshCarousel(false)));
    }
    if (id === "results") {
      deferFrame(() => {
        const heroImage = document.querySelector("#result-hero .result-hero-art img");
        if (heroImage) {
          heroImage.loading = "eager";
          try { heroImage.fetchPriority = "high"; } catch (_) {}
        }
      });
    }
  },
  startQuiz(entryPoint){
    resetState();
    Stations.renderAll();
    QuizTiming.quizStartTs = Date.now();
    QuizTiming.lastStation = null;
    track(APP_EVENTS.QUIZ_STARTED, { entry_point: entryPoint || "unknown" });
    Nav.show("station1");
    enterStation("station1", "initial");
  }
};

/* ---------------------------------------------------------------------
   題目渲染
--------------------------------------------------------------------- */
/* Likert 以文字標籤呈現，不只顯示 1–5 數字 */
const VALUE_LABELS = ["完全偏左邊", "有點偏左邊", "都可以", "有點偏右邊", "完全偏右邊"];

function sliderRowHTML(q){
  const val = State.answers[q.id] !== undefined ? State.answers[q.id] : 3;
  return `
    <div class="slider-row" id="row-${q.id}">
      <div class="q-text">${q.text}</div>
      <input type="range" min="1" max="5" step="1" value="${val}" aria-label="${q.text}"
             oninput="Stations.onSlider('${q.id}', this.value)">
      <div class="slider-labels">
        <span>${q.leftLabel}</span>
        <span class="slider-value" id="val-${q.id}">${VALUE_LABELS[val-1]}</span>
        <span>${q.rightLabel}</span>
      </div>
    </div>`;
}

function singleSelectHTML(q){
  const chosen = State.answers[q.id];
  return `
    <div class="single-select-block">
      <div class="q-text">${q.text}</div>
      ${q.options.map((opt,i) => `
        <label class="option ${chosen===i ? 'selected':''}">
          <input type="radio" name="${q.id}" ${chosen===i?'checked':''} onchange="Stations.onSingle('${q.id}', ${i})">
          <span>${opt.label}</span>
        </label>`).join("")}
    </div>`;
}

const Stations = {
  renderAll(){
    ["station1","station2","station3"].forEach(sid => {
      const mount = document.getElementById(sid+"-mount");
      mount.innerHTML = STATIONS[sid].map(q => q.type === "slider" ? sliderRowHTML(q) : singleSelectHTML(q)).join("");
    });
    Stations.renderBaseline();
  },
  onSlider(id, val){
    State.answers[id] = parseInt(val,10);
    const el = document.getElementById("val-"+id);
    if (el) el.textContent = VALUE_LABELS[State.answers[id]-1];
  },
  onSingle(id, idx){
    State.answers[id] = idx;
    for (const sid of ["station1","station2","station3"]){
      if (STATIONS[sid].some(q => q.id === id)){
        document.getElementById(sid+"-mount").innerHTML =
          STATIONS[sid].map(q => q.type === "slider" ? sliderRowHTML(q) : singleSelectHTML(q)).join("");
        break;
      }
    }
  },
  next(fromId, toId){
    const step = STEP_NUM[fromId];
    if (step) track(APP_EVENTS.QUIZ_STEP_COMPLETED, Object.assign({ quiz_step: step }, stationStats(fromId)));
    Nav.show(toId);
    enterStation(toId, "forward");
  },
  show(id){
    Nav.show(id);
    enterStation(id, "backward");
  },
  setBaseline(v){
    State.baselineClarity = (State.baselineClarity === v) ? null : v;
    Stations.renderBaseline();
  },
  renderBaseline(){
    const el = document.getElementById("baseline-scale");
    if (!el) return;
    const labels = ["1 完全不清楚", "2", "3", "4", "5 非常清楚"];
    el.innerHTML = labels.map((l, i) => `
      <button type="button" class="baseline-btn ${State.baselineClarity === i+1 ? "selected" : ""}"
              onclick="Stations.setBaseline(${i+1})">${l}</button>`).join("");
  },
  restart(){
    const prevTop = ResultState.routes[0] ? ResultState.routes[0].famKey : null;
    track(APP_EVENTS.QUIZ_RESTARTED, { previous_top_role_id: prevTop, source: "result_page" });
    resetState();
    Stations.renderAll();
    QuizTiming.quizStartTs = Date.now();
    QuizTiming.lastStation = null;
    track(APP_EVENTS.QUIZ_STARTED, { entry_point: "unknown" });
    Nav.show("station1");
    enterStation("station1", "initial");
  }
};

/* ---------------------------------------------------------------------
   Scoring v2
--------------------------------------------------------------------- */
function addContrib(family, qid, amount, dir){
  if (amount <= 0) return;
  if (!State.contrib[family]) State.contrib[family] = [];
  State.contrib[family].push({ qid, amount, dir });
}

function addPref(target, qid, amount, dir){
  // target 可以是家族陣列（權重 1）或 {family: weight} 物件
  if (Array.isArray(target)){
    target.forEach(f => { State.preferenceScores[f] += amount; addContrib(f, qid, amount, dir); });
  } else {
    Object.entries(target).forEach(([f, w]) => {
      State.preferenceScores[f] += amount * w;
      addContrib(f, qid, amount * w, dir);
    });
  }
}

function applyPrefSlider(q, value){
  // 只有明確偏好（>=4）才加分；低分只有在 lowIsMeaningful 時才代表另一種偏好
  if (value >= 4 && q.high) addPref(q.high, q.id, value - 3, "high");
  if (value <= 2 && q.lowIsMeaningful === true && q.low)
    addPref(Array.isArray(q.low) ? q.low : q.low, q.id, (3 - value) * (q.lowWeight ?? 0.5), "low");
}

function applyEnvSlider(q, value){
  State.environmentScores[q.env] = value;
  const offset = value - 3;
  if (q.industryHigh && offset > 0) q.industryHigh.forEach(d => State.industryScores[d] = (State.industryScores[d]||0) + offset);
  if (q.industryHighAtMax && value >= 4) q.industryHighAtMax.forEach(d => State.industryScores[d] = (State.industryScores[d]||0) + (value-3));
  if (q.industryHighAtMin && value <= 2) q.industryHighAtMin.forEach(d => State.industryScores[d] = (State.industryScores[d]||0) + (3-value));
}

function applySingle(q, idx){
  const opt = q.options[idx];
  if (!opt) return;
  const w = q.weight || 1;
  if (q.system === "preference" && opt.family){
    Object.entries(opt.family).forEach(([f, d]) => {
      State.preferenceScores[f] += d * w;
      addContrib(f, q.id, d * w, idx);
    });
  }
  if (q.system === "background" && opt.background){
    Object.entries(opt.background).forEach(([dim, v]) =>
      State.backgroundScores[dim] = Math.max(State.backgroundScores[dim] || 0, v));
  }
  // 科系仍可小幅影響產業/領域（權重已在 config 內降低），不影響 Job Family
  if (opt.industry) Object.entries(opt.industry).forEach(([k, d]) => State.industryScores[k] = (State.industryScores[k]||0) + d);
  if (opt.domain) Object.entries(opt.domain).forEach(([k, d]) => State.domainScores[k] = (State.domainScores[k]||0) + d);
}

function computeAllScores(){
  FAMILIES.forEach(f => State.preferenceScores[f] = 0);
  State.backgroundScores = { coding: 0, math_stats: 0, business_domain: 0, software_eng: 0 };
  State.environmentScores = {};
  State.industryScores = {};
  State.domainScores = {};
  State.contrib = {};

  Object.values(STATIONS).flat().forEach(q => {
    const ans = State.answers[q.id];
    if (ans === undefined) return;
    if (q.type === "single") applySingle(q, ans);
    else if (q.system === "environment") applyEnvSlider(q, ans);
    else applyPrefSlider(q, ans);
  });

  State.confidence = computeConfidence();
}

/* ---------------------------------------------------------------------
   Background gap / advantages
--------------------------------------------------------------------- */
function backgroundGap(famKey){
  const req = BACKGROUND_REQUIREMENTS[famKey] || {};
  const gaps = [];
  let gapSum = 0;
  for (const [dim, need] of Object.entries(req)){
    const have = State.backgroundScores[dim] || 0;
    if (need - have > 0){ gaps.push({ dim, need, have, gap: need - have }); gapSum += need - have; }
  }
  gaps.sort((a,b) => b.gap - a.gap);
  return { gaps, gapSum };
}

function backgroundAdvantages(famKey){
  const req = BACKGROUND_REQUIREMENTS[famKey] || {};
  const adv = [];
  for (const [dim, need] of Object.entries(req)){
    const have = State.backgroundScores[dim] || 0;
    if (need > 0 && have >= need) adv.push(dim);
  }
  return adv;
}

/* ---------------------------------------------------------------------
   Top 3 路線 v2：最適合 / 鄰近（adjacency）/ 挑戰（gap+aspiration）
--------------------------------------------------------------------- */
function pickRoutes(){
  const ranked = FAMILIES.slice().sort((a,b) => State.preferenceScores[b] - State.preferenceScores[a]);
  const main = ranked[0];

  // 鄰近：從 adjacency 候選中取偏好分數最高者
  const adjacency = (FAMILY_ADJACENCY[main] || []).filter(f => f !== main);
  let near = adjacency.length
    ? adjacency.slice().sort((a,b) => State.preferenceScores[b] - State.preferenceScores[a])[0]
    : ranked[1];

  // 挑戰：challengeScore = preference - backgroundGapPenalty + aspirationBonus
  const a = State.answers;
  const aspiration = (Math.max(0, (a.coding_effort ?? 3) - 3) + Math.max(0, (a.algorithm_effort ?? 3) - 3)) * 0.5;
  const candidates = FAMILIES.filter(f => f !== main && f !== near);
  let challenge = null, bestScore = -Infinity;
  for (const f of candidates){
    const pref = State.preferenceScores[f];
    if (pref <= 0) continue;
    const { gapSum } = backgroundGap(f);
    const score = pref - gapSum * 0.5 + (TECH_FAMILIES.has(f) ? aspiration : 0);
    if (score > bestScore){ bestScore = score; challenge = f; }
  }
  if (!challenge) challenge = ranked.find(f => f !== main && f !== near) || ranked[2];

  return { main, near, challenge };
}

/* ---------------------------------------------------------------------
   信心與清晰度
--------------------------------------------------------------------- */
function computeConfidence(){
  const prefSliders = Object.values(STATIONS).flat().filter(q => q.type === "slider" && q.system === "preference");
  const answered = prefSliders.filter(q => State.answers[q.id] !== undefined);
  const neutral = answered.filter(q => State.answers[q.id] === 3).length;
  const neutralRatio = answered.length ? neutral / answered.length : 1;

  const prefQs = Object.values(STATIONS).flat().filter(q => q.system === "preference");
  const coverage = prefQs.filter(q => State.answers[q.id] !== undefined).length / prefQs.length;

  const sorted = FAMILIES.map(f => State.preferenceScores[f]).sort((a,b) => b-a);
  const [s1, s2, s3] = [sorted[0], sorted[1], sorted[2]];
  const spread = s1 - sorted[sorted.length - 1];

  const triggers = [];
  if (neutralRatio > 0.5) triggers.push("多數偏好題回答接近中間值");
  if (s1 - s3 < 2) triggers.push("前三名分數非常接近");
  if (s1 < 4) triggers.push("有效偏好訊號不足");
  if (spread < 4) triggers.push("各職能分數差距很小");

  let score = 30 + 25 * (1 - neutralRatio) + Math.min(20, Math.max(0, s1 - s2) * 5)
            + Math.min(15, Math.max(0, s1) * 1.5) + 10 * coverage;
  score = Math.round(Math.max(0, Math.min(100, score)));

  const matchLevel = (score >= 70 && s1 >= 6) ? "High" : (score >= 45 ? "Medium" : "Low");
  const clarity = (triggers.length === 0 && s1 - s2 >= 2) ? "Clear"
    : (triggers.length <= 1 ? "Mixed" : "Exploratory");

  return { score, matchLevel, clarity, triggers, lowConfidence: triggers.length >= 1 };
}

const MATCH_ZH = { High: "高", Medium: "中", Low: "低" };
const CLARITY_ZH = { Clear: "清楚", Mixed: "混合", Exploratory: "尚在探索" };

/* 各路線的配對程度（高/中/低），非能力分數 */
function routeMatchLevel(famKey){
  const s1 = Math.max(...FAMILIES.map(f => State.preferenceScores[f]));
  const s = State.preferenceScores[famKey];
  if (s >= Math.max(6, 0.8 * s1) && State.confidence.matchLevel !== "Low") return "High";
  if (s >= 3) return "Medium";
  return "Low";
}

/* ---------------------------------------------------------------------
   推薦理由 — 只從 preference 貢獻產生
--------------------------------------------------------------------- */
function reasonsFor(famKey){
  const entries = (State.contrib[famKey] || []).slice().sort((a,b) => b.amount - a.amount);
  const seen = new Set(); const out = [];
  for (const e of entries){
    if (seen.has(e.qid)) continue;
    seen.add(e.qid);
    if (QUESTION_DIMENSIONS[e.qid] !== "preference") continue; // 保險：非偏好題不得成為理由
    const t = REASON_TEXT[e.qid];
    if (!t) continue;
    const text = Array.isArray(t) ? t[e.dir] : t[e.dir];
    if (text) out.push(text);
    if (out.length >= 4) break;
  }
  return out;
}

/* ---------------------------------------------------------------------
   環境摘要與 trade-off（不影響配對，只呈現）
--------------------------------------------------------------------- */
function environmentLines(){
  const lines = [];
  for (const [dim, v] of Object.entries(State.environmentScores)){
    const cfg = ENVIRONMENT_LABELS[dim];
    if (!cfg) continue;
    if (v >= 4) lines.push(cfg.high + "。");
    else if (v <= 2) lines.push(cfg.low + "。");
  }
  return lines;
}

function environmentTradeoffs(famKey){
  const p = State.careers.meta.family_profiles[famKey];
  const r = p.radar || []; // [技術硬度, 人際客戶, 創新程度, 抗壓強度, 薪資上限, 生活穩定]
  const e = State.environmentScores;
  const out = [];
  if ((e.worklife ?? 3) >= 4 && r[5] <= 2) out.push(`你重視生活平衡，但「${p.cn_name}」的生活穩定屬性偏低，選擇公司與產業時需特別留意。`);
  if ((e.stability ?? 3) >= 4 && r[5] <= 2) out.push(`你重視工作保障，這條路線的穩定屬性偏低，兩者存在取捨。`);
  if ((e.compensation ?? 3) >= 4 && r[4] <= 2) out.push(`你追求收入上限，這條路線的薪資天花板屬性中等偏低，可能需要靠產業選擇彌補。`);
  if ((e.intensity ?? 3) <= 2 && r[3] >= 4) out.push(`這條路線常見高強度節奏，與你偏好的步調存在取捨。`);
  return out;
}

/* ---------------------------------------------------------------------
   個人輪廓
--------------------------------------------------------------------- */
function profileSummary(){
  const a = State.answers;
  const tech = ((a.coding_effort ?? 3) + (a.algorithm_effort ?? 3)) / 2;
  const interact = a.stakeholder_freq ?? 3;
  if (tech <= 2.5 && interact >= 3.5) return "你較偏向用資料理解商業問題、協助團隊做決策，而不是投入底層系統與模型建置。";
  if (tech >= 4 && interact <= 2.5)  return "你偏向深入技術與模型本身，享受長時間把系統或演算法做深做穩，勝過頻繁的跨部門討論。";
  if (tech >= 4 && interact >= 3.5)  return "你同時願意投入技術深度、也享受跨部門協作，適合站在技術與業務之間的橋樑型角色。";
  if (tech <= 2.5 && interact <= 2.5) return "你偏好穩定地把分析做紮實，讓數據品質與正確性說話，而不是追逐舞台或底層技術。";
  return "你在技術投入與商業導向之間保持彈性，適合先從泛用型的資料分析角色開始探索。";
}

function profileTags(){
  const a = State.answers; const tags = [];
  const ce = a.coding_effort ?? 3;
  if (ce >= 4) tags.push("高技術投入"); else if (ce === 3) tags.push("中度技術投入"); else tags.push("先從工具上手");
  if ((a.stakeholder_freq ?? 3) >= 4) tags.push("高互動協作");
  if ((a.deep_focus ?? 3) >= 4) tags.push("深度專注");
  if ((a.ambiguity ?? 3) >= 4) tags.push("喜歡定義問題");
  else if ((a.ambiguity ?? 3) <= 2) tags.push("重視明確需求");
  if ((a.stable_delivery ?? 3) >= 4) tags.push("重視穩定交付");
  const ptTags = ["喜歡找出原因","預測導向","最佳化思維","平台思維","產品流程導向","品質風險意識"];
  if (a.problem_type !== undefined) tags.push(ptTags[a.problem_type]);
  return tags.slice(0, 4);
}

/* ---------------------------------------------------------------------
   圖片
--------------------------------------------------------------------- */
function slugify(s){
  return (s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
function altPaths(file){
  const base = file.replace(/\.(jpg|jpeg|png)$/i, "");
  return [`${base}.jpg`, `${base}.png`, base].filter(f => f !== file).join("|");
}
const IMG_ONERROR = `
  var alts=(this.dataset.alts||'').split('|').filter(Boolean);
  if(alts.length){this.dataset.alts=alts.slice(1).join('|');this.src=alts[0];}
  else{this.style.display='none';this.nextElementSibling.style.display='flex';}
`.replace(/\n\s*/g, "");

function portraitHTML(p, sizeClass){
  const file = p.card_image || `images/${slugify(p.class_title_en)}.jpg`;
  const cls = sizeClass ? `square-portrait ${sizeClass}` : "square-portrait";
  const isHero = String(sizeClass || "").split(/\s+/).includes("hero");
  const loading = isHero ? "eager" : "lazy";
  const priority = isHero ? ' fetchpriority="high"' : "";
  return `
    <div class="${cls}" aria-label="${p.class_title}｜${p.cn_name}角色圖片">
      <img src="${file}" data-alts="${altPaths(file)}" alt="${p.class_title}｜${p.cn_name}" loading="${loading}" decoding="async"${priority} onerror="${IMG_ONERROR}">
      <span class="portrait-fallback" style="background:${p.color};">${p.icon}</span>
    </div>`;
}
function iconDotHTML(p){
  const iconFile = p.icon_image || `images/icon-${slugify(p.class_title_en)}.jpg`;
  return `
    <div class="map-icon" style="border-color:${p.glow};" title="${p.class_title}｜${p.cn_name}（代表物：${p.class_item}）">
      <img src="${iconFile}" data-alts="${altPaths(iconFile)}" alt="${p.class_item}" loading="lazy" onerror="${IMG_ONERROR}">
      <span class="portrait-fallback" style="background:${p.color}; font-size:16px;">${p.icon}</span>
    </div>`;
}
function famVars(p){
  return `--fam-color:${p.color}; --fam-glow:${p.glow}; --fam-glow-soft:${p.glow}4d; --fam-border:${p.glow}55;`;
}

/* ---------------------------------------------------------------------
   Radar / hexagon（純 SVG）
--------------------------------------------------------------------- */
function radarSVG(values, axes, color, size){
  size = size || 130;
  const cx = size/2, cy = size/2;
  const r = size/2 - (axes ? 30 : 8);
  const n = values.length;
  const angleFor = i => (Math.PI*2*i/n) - Math.PI/2;

  const gridPolys = [0.25,0.5,0.75,1].map(level => {
    const pts = Array.from({length:n}, (_,i) => {
      const a = angleFor(i);
      return `${(cx + r*level*Math.cos(a)).toFixed(1)},${(cy + r*level*Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="var(--border)" stroke-width="1"/>`;
  }).join("");

  const axisLines = Array.from({length:n}, (_,i) => {
    const a = angleFor(i);
    const x = cx + r*Math.cos(a), y = cy + r*Math.sin(a);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`;
  }).join("");

  const dataPts = values.map((v,i) => {
    const a = angleFor(i);
    const rad = r * (Math.max(0,Math.min(5,v))/5);
    return `${(cx + rad*Math.cos(a)).toFixed(1)},${(cy + rad*Math.sin(a)).toFixed(1)}`;
  }).join(" ");

  const labels = axes ? Array.from({length:n}, (_,i) => {
    const a = angleFor(i);
    const lx = cx + (r+17)*Math.cos(a), ly = cy + (r+17)*Math.sin(a);
    const anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
    return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" fill="var(--sub)" text-anchor="${anchor}" dominant-baseline="middle">${axes[i]}</text>`;
  }).join("") : "";

  const padX = axes ? 64 : 0;
  const padY = axes ? 10 : 0;
  return `
    <svg viewBox="${-padX} ${-padY} ${size + 2*padX} ${size + 2*padY}" width="${size + 2*padX}" height="${size + 2*padY}" class="radar-chart" style="max-width:100%; height:auto;">
      ${gridPolys}${axisLines}
      <polygon points="${dataPts}" fill="${color}2e" stroke="${color}" stroke-width="2"/>
      ${labels}
    </svg>`;
}

const TECH_DEPTH_COPY = {
  [F.DABI]: "需要 SQL、報表與把數據說清楚的能力。",
  [F.DS]: "需要 Python、統計建模與解釋模型結果的能力。",
  [F.MLE]: "需要機器學習、軟體工程與模型上線能力。",
  [F.DE]: "需要 SQL、資料建模與穩定維護資料流程的能力。",
  [F.OR]: "需要數學建模、最佳化與程式實作能力。",
  [F.STRAT]: "需要問題拆解、商業判斷與溝通推動能力。",
  [F.PROD]: "需要需求拆解、流程設計與跨部門協作能力。",
  [F.FIN]: "需要財務風險、統計分析與程式能力。",
  [F.GOV]: "需要資料品質、規則設計與跨部門治理能力。"
};
function technicalDepthCopy(famKey){
  return TECH_DEPTH_COPY[famKey] || "需要能獨立完成這類工作的核心工具與方法。";
}

/* ---------------------------------------------------------------------
   共用角色詳細內容（結果頁與圖鑑共用）
   ctx（僅結果頁）= { routeLabel, matchLevel, reasons, background, envLines,
                     tradeoffs, isChallenge }
--------------------------------------------------------------------- */
function familyDetailHTML(famKey, ctx){
  const p = State.careers.meta.family_profiles[famKey];
  const meta = State.careers.meta;
  const examples = State.careers.tracks.filter(t => t.job_family === famKey);
  const list = arr => (arr||[]).map(x => `<li>${x}</li>`).join("");

  const reasonsBlock = (ctx && ctx.reasons && ctx.reasons.length) ? `
    <div class="detail-block">
      <div class="detail-label">🧭 為什麼推薦這條路線</div>
      <ul class="detail-list">${list(ctx.reasons.map(r => r + "。"))}</ul>
      <div class="detail-note">理由僅來自你的「工作內容偏好」作答；科系與環境偏好不會出現在這裡，也不影響排名。</div>
    </div>` : "";

  let backgroundBlock = "";
  if (ctx && ctx.background){
    const b = ctx.background;
    const advLines = b.advantages.map(dim => `你的${BACKGROUND_DIMS[dim]}基礎已達這條路線的常見起點。`);
    const gapLines = b.gaps.slice(0,3).map(g => `${BACKGROUND_DIMS[g.dim]}還需補強（目前約 ${g.have}/5，常見起點約 ${g.need}/5）。`);
    const challengeLine = ctx.isChallenge && b.gaps.length
      ? `<div class="detail-note">為什麼是挑戰選項：你的偏好有相當契合，但${b.gaps.slice(0,2).map(g => BACKGROUND_DIMS[g.dim]).join("與")}與常見起點還有距離，需要額外投資。</div>` : "";
    backgroundBlock = `
      <div class="detail-block">
        <div class="detail-label">🎓 你的入門優勢與差距</div>
        <ul class="detail-list">${list([...advLines, ...gapLines])}</ul>
        ${advLines.length + gapLines.length === 0 ? `<div class="detail-value">科系題未作答，暫無法評估起點。</div>` : ""}
        ${challengeLine}
        <div class="detail-note">起點為主觀參考值，用於估計補強成本，不代表能力上限。</div>
      </div>`;
  }

  let envBlock = "";
  if (ctx && (ctx.envLines?.length || ctx.tradeoffs?.length)){
    envBlock = `
      <details class="method-details">
        <summary>🌤️ 你偏好的工作環境（不影響配對）</summary>
        ${ctx.envLines?.length ? `<ul class="detail-list">${list(ctx.envLines)}</ul>` : ""}
        ${ctx.tradeoffs?.length ? `<ul class="detail-list">${list(ctx.tradeoffs)}</ul>` : ""}
      </details>`;
  }

  const matchBlock = (ctx && ctx.matchLevel) ? `
    <div class="match-row" style="margin:6px 0 0;">
      <span class="route-pill">${ctx.routeLabel}</span>
      配對程度：<b>${MATCH_ZH[ctx.matchLevel]}</b>
      <span class="info-tip" tabindex="0">ⓘ<span class="info-bubble">${meta.match_index_note}｜信心分數 ${State.confidence ? State.confidence.score : "-"}／100（僅供參考）</span></span>
    </div>` : "";

  const chips = arr => (arr||[]).map(x => `<span class="chip">${x}</span>`).join("");
  const companies = [...new Set(examples.map(t => t.company))].slice(0, 8);

  return `
    <div class="family-detail-head" style="${famVars(p)}">
      ${portraitHTML(p, "lg")}
      <div>
        <div class="official-zh" style="font-size:19px;">${p.cn_name}</div>
        <div class="official-en">${p.en_name}</div>
        <div class="rpg-badge">「${p.class_title}」</div>
        <div class="tech-depth-summary" aria-label="技術深度 ${p.tlevel_range || "依職缺而定"}">
          <strong>技術深度：${p.tlevel_range || "依職缺而定"}</strong>
          <span>${technicalDepthCopy(famKey)}</span>
        </div>
        ${p.salary_taiwan ? `<div class="stat-chips"><span class="chip">💰 有公開薪資</span></div>` : ""}
        ${matchBlock}
      </div>
    </div>

    <div class="detail-block role-one-line">
      <div class="detail-label">一句話看懂</div>
      <div class="detail-value">${p.tagline || p.role_description}</div>
    </div>

    ${reasonsBlock}
    ${backgroundBlock}
    ${envBlock}

    <div class="detail-block">
      <div class="detail-label">常見職稱</div>
      <div class="chip-row">${chips(p.representative_titles)}</div>
      ${p.advanced_titles ? `<div class="detail-note" style="margin-top:8px;">進階（需多年經驗）</div><div class="chip-row">${chips(p.advanced_titles)}</div>` : ""}
    </div>

    <div class="detail-block">
      <div class="detail-label">必學技能</div>
      <div class="chip-row">${chips(p.starter_skills)}</div>
    </div>

    <div class="detail-block starter-block">
      <div class="detail-label">👣 下一步</div>
      <div class="detail-value">${p.next_step}</div>
    </div>
    <div class="detail-block starter-block">
      <div class="detail-label">🛠️ 第一個作品集</div>
      <div class="detail-value">${p.starter_portfolio}</div>
    </div>

    <details class="method-details">
      <summary>日常工作與需要留意的地方</summary>
      <div class="detail-label" style="margin-top:10px;">常見工作內容</div>
      <ul class="detail-list">${list(p.daily_tasks)}</ul>
      <div class="detail-label" style="margin-top:10px;">⚠️ 你需要留意</div>
      <ul class="detail-list">${list(p.tradeoffs)}</ul>
      ${p.titles_note ? `<div class="detail-note" style="margin-top:8px;">${p.titles_note}</div>` : ""}
    </details>

    <details class="method-details">
      <summary>薪資、路徑與入行門檻</summary>
      <div class="detail-grid">
        <div>
          <div class="detail-label">💰 薪資（台灣）</div>
          <div class="detail-value">${p.salary_taiwan || "暫無公開資料"}</div>
          <div class="detail-note">${p.salary_note || ""}${p.salary_source ? ` · <a href="${p.salary_source}" target="_blank" rel="noopener noreferrer">來源</a>` : ""}</div>
        </div>
        <div>
          <div class="detail-label">🛤️ 職涯路徑</div>
          <div class="detail-value">${p.career_path}</div>
        </div>
        <div>
          <div class="detail-label">🎫 入行門檻</div>
          <div class="detail-value">${p.entry_requirements}</div>
        </div>
        <div>
          <div class="detail-label">📌 小提醒</div>
          <div class="detail-value">${p.tip}</div>
        </div>
      </div>
      <div class="detail-label" style="margin-top:6px;">🔎 可搜尋的實習職稱</div>
      <div class="chip-row">${chips(p.internship_titles)}</div>
    </details>

    <details class="method-details">
      <summary>角色設定與特性圖</summary>
      <p class="class-lore">${p.class_lore}</p>
      <div class="radar-detail-wrap">${radarSVG(p.radar, meta.radar_axes, p.color, 230)}</div>
      <div class="detail-note" style="text-align:center;">主觀啟發式評分，非統計量測</div>
    </details>

    ${companies.length ? `
    <div class="detail-block">
      <div class="detail-label">哪些公司開過這種缺</div>
      <div class="chip-row">${chips(companies)}</div>
    </div>` : ""}

    <details class="method-details" ${examples.length <= 4 ? "open" : ""}>
      <summary>範例職缺（真實來源，${examples.length} 筆）</summary>
      <div class="card-grid" style="margin-top:12px;">
        ${examples.length ? examples.map(t => jobCardHTML(t)).join("") : `<div class="job-hint">此家族目前尚無收錄的種子職缺。</div>`}
      </div>
    </details>
  `;
}

/* ---------------------------------------------------------------------
   Results
--------------------------------------------------------------------- */
const ResultState = {
  selectedRoute: null,
  selectedDomain: null,
  routes: []
};

const ROUTE_META = [
  { label: "最適合", cls: "route-best", note: "工作內容偏好最契合，現階段最值得優先準備" },
  { label: "鄰近選項", cls: "route-near", note: "與主路線工作內容相近，技能重疊高、容易轉換" },
  { label: "挑戰選項", cls: "route-stretch", note: "偏好有相當契合，但背景或技術需要額外補強" }
];

const Results = {
  compute(){
    track(APP_EVENTS.QUIZ_STEP_COMPLETED, Object.assign({ quiz_step: 3 }, stationStats("station3")));

    computeAllScores();
    ResultState.selectedRoute = null;
    ResultState.selectedDomain = null;
    ResultState.feedback = { submitted: false, acc: null, before: State.baselineClarity, after: null, pref: null };
    QuizTiming.resultRun += 1;

    const { main, near, challenge } = pickRoutes();
    ResultState.routes = [main, near, challenge].map((famKey, i) => ({
      famKey,
      label: ROUTE_META[i].label,
      cls: ROUTE_META[i].cls,
      note: ROUTE_META[i].note,
      matchLevel: routeMatchLevel(famKey),
      reasons: reasonsFor(famKey),
      background: backgroundGap(famKey) && {
        advantages: backgroundAdvantages(famKey),
        gaps: backgroundGap(famKey).gaps
      },
      isChallenge: i === 2
    }));

    Results.renderProfile();
    Results.renderRoutes();
    Results.renderNext30();
    Results.renderEnvProfile();
    Results.renderFeedback();
    Results.renderRouteFilter();
    Results.renderDomainFilter();
    Results.renderJobs();

    // quiz_completed + result_viewed：每次「完成新測驗」各一次（re-render 不會重跑 compute）
    const totalT = QuizTiming.quizStartTs
      ? Math.max(0, Math.min(3600, Math.round((Date.now() - QuizTiming.quizStartTs) / 1000))) : undefined;
    track(APP_EVENTS.QUIZ_COMPLETED, { total_time_spent_sec: totalT, completed_step_count: 3, result_count: 3 });
    track(APP_EVENTS.RESULT_VIEWED, {
      role_id: main, recommendation_rank: 1,
      top_role_id: main, second_role_id: near, third_role_id: challenge,
      result_count: 3, scoring_version: (window.ANALYTICS_CONFIG && window.ANALYTICS_CONFIG.SCORING_VERSION) || "v2"
    });

    Nav.show("results");
  },

  renderProfile(){
    const tags = profileTags();
    const hexValues = HEX_AXES.map(ax => ax.calc(State.answers));
    const c = State.confidence;
    const banner = c.lowConfidence ? `
      <div class="low-confidence-banner">
        你的回答多數接近中間值，目前沒有非常明確的單一路線。這不是問題，代表你可能適合先從
        Data Analytics、Business Analysis 或 Product Analytics 等泛用型角色開始探索。
        <div class="detail-note" style="margin-top:6px;">（${c.triggers.join("；")}）</div>
      </div>` : "";

    document.getElementById("profile-summary").innerHTML = `
      <div class="profile-wrap">
        <h3 class="profile-title-main">你的資料職涯輪廓</h3>
        <p class="profile-sentence">${profileSummary()}</p>
        <div class="tag-row profile-tags">${tags.map(t => `<span class="profile-tag">${t}</span>`).join("")}</div>
        <div class="confidence-row">
          結果清晰度：<b>${CLARITY_ZH[c.clarity]}</b>｜配對信心：<b>${MATCH_ZH[c.matchLevel]}</b>
          <span class="info-tip" tabindex="0">ⓘ<span class="info-bubble">信心分數 ${c.score}／100，綜合「非中立回答比例、第一與第二名差距、有效作答覆蓋度」計算，僅供參考，不是心理量表。</span></span>
        </div>
        ${banner}
        <details class="method-details">
          <summary>看我的偏好輪廓圖</summary>
          <div class="hex-wrap">
            ${radarSVG(hexValues, HEX_AXES.map(a => a.label), "#d4af37", 270)}
            <div class="detail-note">由作答換算，不是能力評量。</div>
          </div>
        </details>
        <details class="method-details">
          <summary>結果怎麼算？</summary>
          <p>依你的回答，計算與九種角色「工作內容偏好」的相似程度，取前三名。這是探索工具，不是能力、人格或錄用測驗；科系與環境偏好不影響排名。</p>
        </details>
      </div>`;
  },

  /* 路線卡瘦身：圖片＋職稱＋一句＋配對程度＋按鈕（其餘進 Modal）*/
  renderRoutes(){
    const html = ResultState.routes.map((r, i) => {
      const p = State.careers.meta.family_profiles[r.famKey];
      return `
        <div class="route-card ${r.cls}" style="${famVars(p)}" onclick="Results.openRoute(${i})">
          <div class="route-pill">${r.label}</div>
          ${portraitHTML(p)}
          <div class="official-zh">${p.cn_name}</div>
          <div class="rpg-badge">「${p.class_title}」</div>
          <div class="route-oneliner">${p.tagline}</div>
          ${i === 0 && r.reasons.length ? `<ul class="route-why">${r.reasons.slice(0,3).map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
          <div class="match-row">配對 <b>${MATCH_ZH[r.matchLevel]}</b>
            <span class="info-tip" tabindex="0" onclick="event.stopPropagation()">ⓘ<span class="info-bubble">${State.careers.meta.match_index_note}｜信心分數 ${State.confidence.score}／100（僅供參考）</span></span>
          </div>
          <button class="btn btn-ghost route-btn" onclick="event.stopPropagation(); Results.openRoute(${i})">為什麼是我？</button>
        </div>`;
    }).join("");

    document.getElementById("route-cards").innerHTML = `<div class="route-grid">${html}</div>`;
  },

  openRoute(i){
    const r = ResultState.routes[i];
    if (!r) return;
    track(APP_EVENTS.ROLE_OPENED, { role_id: r.famKey, recommendation_rank: i + 1, source: "result_page" });
    Modal.open(familyDetailHTML(r.famKey, {
      routeLabel: r.label,
      matchLevel: r.matchLevel,
      reasons: r.reasons,
      background: r.background,
      envLines: environmentLines(),
      tradeoffs: environmentTradeoffs(r.famKey),
      isChallenge: r.isChallenge
    }));
  },

  renderNext30(){
    const main = ResultState.routes[0];
    if (!main){ document.getElementById("next30").innerHTML = ""; return; }
    const p = State.careers.meta.family_profiles[main.famKey];
    const actions = [
      `閱讀 5 份「${(p.representative_titles||[]).slice(0,2).join("／")}」的真實職缺，記下重複出現的技能與要求`,
      p.starter_portfolio,
      `找一位做過「${p.cn_name}」相關工作的學長姐或業界人士，進行 20 分鐘訪談`
    ];
    document.getElementById("next30").innerHTML = `
      <div class="next30-card" style="${famVars(p)}">
        <h3 class="next30-title">接下來 30 天，可以做這三件事</h3>
        <ol class="next30-list">${actions.map(a => `<li>${a}</li>`).join("")}</ol>
      </div>`;
  },

  /* 工作環境偏好摘要 — 只呈現，不影響配對 */
  renderEnvProfile(){
    const lines = environmentLines();
    const tradeoffs = ResultState.routes.length ? environmentTradeoffs(ResultState.routes[0].famKey) : [];
    const body = lines.length
      ? `<ul class="detail-list">${lines.map(l => `<li>${l}</li>`).join("")}</ul>`
      : `<div class="detail-value">沒有特別強烈的環境偏好，選擇彈性大。</div>`;
    document.getElementById("env-profile").innerHTML = `
      <details class="env-card method-details" style="padding:18px 26px;">
        <summary>你偏好的工作環境（不影響配對）</summary>
        ${body}
        ${tradeoffs.length ? `<div class="detail-label" style="margin-top:10px;">與主路線的可能取捨</div><ul class="detail-list">${tradeoffs.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
      </details>`;
  },

  /* 第一層 filter：三條探索路線（單選，點同一個取消） */
  renderRouteFilter(){
    const profiles = State.careers.meta.family_profiles;
    document.getElementById("route-filter-chips").innerHTML = ResultState.routes.map((r, i) => {
      const p = profiles[r.famKey];
      return `
        <div class="tag route-filter-chip ${ResultState.selectedRoute === i ? "selected" : ""}"
             style="${famVars(p)}" onclick="Results.selectRoute(${i})">
          <span class="domain-chip-name">${r.label}｜${p.cn_name}</span>
          <span class="domain-chip-note">${(p.representative_titles||[]).slice(0,2).join("・")}</span>
        </div>`;
    }).join("");
  },

  selectRoute(i){
    ResultState.selectedRoute = (ResultState.selectedRoute === i) ? null : i;
    ResultState.selectedDomain = null;
    Results.renderRouteFilter();
    Results.renderDomainFilter();
    Results.renderJobs();
  },

  renderDomainFilter(){
    const el = document.getElementById("result-domain-chips");
    if (ResultState.selectedRoute === null){
      el.innerHTML = `<div class="job-hint">先在上方選擇一條探索路線。</div>`;
      return;
    }
    const fam = ResultState.routes[ResultState.selectedRoute].famKey;
    const notes = State.careers.meta.domain_notes || {};
    const domains = [...new Set(State.careers.tracks.filter(t => t.job_family === fam).map(t => t.domain))];
    el.innerHTML = domains.length ? domains.map(d => `
      <div class="tag domain-chip ${ResultState.selectedDomain === d ? "selected" : ""}"
           onclick="Results.selectDomain('${d.replace(/'/g,"\\'")}')">
        <span class="domain-chip-name">${d}</span>
        ${notes[d] ? `<span class="domain-chip-note">${notes[d]}</span>` : ""}
      </div>
    `).join("") : `<div class="job-hint">這條路線目前還沒有收錄的種子職缺。</div>`;
  },

  selectDomain(d){
    const willSelect = ResultState.selectedDomain !== d; // 使用者主動點擊，非 UI 初始化
    ResultState.selectedDomain = willSelect ? d : null;
    const route = ResultState.routes[ResultState.selectedRoute];
    track(APP_EVENTS.DOMAIN_SELECTED, {
      domain_id: d, role_id: route ? route.famKey : undefined,
      selection_action: willSelect ? "select" : "deselect"
    });
    Results.renderDomainFilter();
    Results.renderJobs();
  },

  renderJobs(){
    const hint = document.getElementById("result-jobs-hint");
    const jobsEl = document.getElementById("result-jobs");
    if (ResultState.selectedRoute === null){
      hint.textContent = "依序選擇「探索路線」與「領域」，查看對應的真實職缺。";
      hint.style.display = "block"; jobsEl.innerHTML = ""; return;
    }
    if (ResultState.selectedDomain === null){
      hint.textContent = "再選擇一個領域，即可查看真實職缺。";
      hint.style.display = "block"; jobsEl.innerHTML = ""; return;
    }
    const fam = ResultState.routes[ResultState.selectedRoute].famKey;
    const matches = State.careers.tracks.filter(t => t.job_family === fam && t.domain === ResultState.selectedDomain);
    hint.style.display = "none";
    jobsEl.innerHTML = matches.length
      ? matches.map((t, i) => jobCardHTML(t, { routes: ResultState.routes }, i + 1)).join("")
      : `<div class="job-hint">這個組合目前還沒有種子職缺，歡迎換個領域看看。</div>`;
    matches.forEach((t, i) => track(APP_EVENTS.JOB_VIEWED, {
      job_id: t.id, role_id: fam, domain_id: t.domain, company_name: t.company,
      source_section: "result_jobs", list_position: i + 1
    }));
  },

  /* ── 匿名結果回饋（選填，不影響瀏覽）── */
  renderFeedback(){
    const el = document.getElementById("result-feedback");
    if (!el) return;
    const fb = ResultState.feedback;
    if (fb.submitted){
      el.innerHTML = `<div class="env-card"><div class="detail-value">已收到你的回饋，謝謝！這會幫助我們校準推薦。</div></div>`;
      return;
    }
    const routes = ResultState.routes;
    const profiles = State.careers.meta.family_profiles;
    const scale = (key, val) => [1,2,3,4,5].map(v => `
      <button type="button" class="baseline-btn ${val === v ? "selected" : ""}"
              onclick="Results.setFeedback('${key}', ${v})">${v}</button>`).join("");
    const beforeBlock = (State.baselineClarity === null) ? `
      <div class="fb-row">
        <div class="fb-q">開始測驗前，你對自己適合的資料職涯方向有多清楚？<span class="fb-scale-hint">1 完全不清楚 → 5 非常清楚</span></div>
        <div class="fb-scale">${scale("before", fb.before)}</div>
      </div>` : "";
    el.innerHTML = `
      <div class="env-card">
        <h3 class="next30-title">這次推薦準嗎？（選填・完全匿名）</h3>
        <div class="fb-row">
          <div class="fb-q">這次推薦符合你對自己的認知嗎？<span class="fb-scale-hint">1 完全不符合 → 5 非常符合</span></div>
          <div class="fb-scale">${scale("acc", fb.acc)}</div>
        </div>
        ${beforeBlock}
        <div class="fb-row">
          <div class="fb-q">看完結果後，你現在有多清楚？<span class="fb-scale-hint">1 完全不清楚 → 5 非常清楚</span></div>
          <div class="fb-scale">${scale("after", fb.after)}</div>
        </div>
        <div class="fb-row">
          <div class="fb-q">你最想進一步探索哪個角色？</div>
          <select class="fb-select" onchange="Results.setFeedback('pref', this.value)">
            <option value="" ${!fb.pref ? "selected" : ""}>請選擇…</option>
            ${routes.map(r => `<option value="${r.famKey}" ${fb.pref === r.famKey ? "selected" : ""}>${profiles[r.famKey].cn_name}（${r.label}）</option>`).join("")}
            <option value="other" ${fb.pref === "other" ? "selected" : ""}>其他九大角色</option>
            <option value="unsure" ${fb.pref === "unsure" ? "selected" : ""}>還不確定</option>
          </select>
        </div>
        <div class="cta-row" style="justify-content:flex-start; margin-top:12px;">
          <button class="btn btn-primary" id="fb-submit" onclick="Results.submitFeedback()">送出回饋</button>
        </div>
        <div class="detail-note" id="fb-msg" style="margin-top:8px;"></div>
        <div class="detail-note">完全匿名、不需登入、不會記錄任何個人資料。</div>
      </div>`;

    // result_feedback_viewed：進入 viewport 時觸發，每次結果一次
    try {
      const runKey = "fb_viewed_" + QuizTiming.resultRun;
      const card = el.querySelector(".env-card");
      if (window.IntersectionObserver && card){
        const obs = new IntersectionObserver((entries) => {
          if (entries.some(e => e.isIntersecting)){
            APP_EVENTS.RESULT_FEEDBACK_VIEWED && window.DMAnalytics && window.DMAnalytics.trackOncePerRun(runKey, APP_EVENTS.RESULT_FEEDBACK_VIEWED, {});
            obs.disconnect();
          }
        });
        obs.observe(card);
      } else {
        APP_EVENTS.RESULT_FEEDBACK_VIEWED && window.DMAnalytics && window.DMAnalytics.trackOncePerRun(runKey, APP_EVENTS.RESULT_FEEDBACK_VIEWED, {});
      }
    } catch (e) {}
  },

  setFeedback(key, val){
    const fb = ResultState.feedback;
    if (key === "pref") fb.pref = val || null;
    else fb[key] = (fb[key] === val) ? null : Number(val);
    Results.renderFeedback();
  },

  submitFeedback(){
    const fb = ResultState.feedback;
    if (fb.submitted) return; // 防重複送出
    const before = State.baselineClarity !== null ? State.baselineClarity : fb.before;
    const missing = fb.acc === null || fb.after === null || !fb.pref || before === null;
    const msg = document.getElementById("fb-msg");
    if (missing){
      if (msg) msg.textContent = "還有題目沒填完——每一題都填好後再送出。";
      return;
    }
    const btn = document.getElementById("fb-submit");
    if (btn) btn.disabled = true; // 防 double click
    const top = ResultState.routes[0] ? ResultState.routes[0].famKey : null;
    const top3 = ResultState.routes.map(r => r.famKey);
    track(APP_EVENTS.RESULT_FEEDBACK_SUBMITTED, {
      accuracy_rating: fb.acc,
      clarity_before: before,
      clarity_after: fb.after,
      preferred_role_id: fb.pref,
      role_id: top,
      preferred_role_was_top_1: fb.pref === top,
      preferred_role_was_top_3: top3.includes(fb.pref),
      clarity_uplift: fb.after - before
    });
    fb.submitted = true;
    Results.renderFeedback();
  }
};

/* ---------------------------------------------------------------------
   職缺卡片（不顯示 RPG 名稱）
--------------------------------------------------------------------- */
function jobCardHTML(t, ctx, listPos){
  const tl = State.careers.meta.technical_levels[t.technical_level];
  const fp = State.careers.meta.family_profiles[t.job_family];
  const salary = t.salary_range
    ? `<span>${t.salary_range}</span>`
    : `<span style="color:var(--sub); font-style:italic;">暫無公開資料</span>`;

  let whyLine = "";
  if (ctx && ctx.routes && ctx.routes.length){
    const hit = ctx.routes.find(r => r.famKey === t.job_family);
    if (hit){
      whyLine = hit.label === "最適合"
        ? `這份職缺與你的主路線「${fp.cn_name}」高度相關。`
        : `這份職缺與你的${hit.label}「${fp.cn_name}」相關。`;
    } else {
      whyLine = `屬於你可能適合的領域「${t.domain}」，可作為延伸參考。`;
    }
  }

  const skills = (t.related_skills || []).slice(0, 5);

  return `
    <div class="job-card" style="${fp ? famVars(fp) : ""}">
      <div class="family-badge">${t.job_family}</div>
      <h4>${t.title}</h4>
      <div class="companies">${t.company}　·　${t.region}</div>
      <div class="tl-badge" title="${tl ? tl.criteria : ""}">${t.technical_level}</div>
      <div class="companies">領域：${t.domain}　·　產業：${t.industry}</div>
      <div class="result-desc" style="font-size:12.5px;"><b>這份工作在做什麼：</b>${t.what_they_do}</div>
      ${skills.length ? `<div class="result-skills"><b>你會需要什麼：</b>${skills.join("、")}</div>` : ""}
      ${whyLine ? `<div class="job-why">${whyLine}</div>` : ""}
      <div class="row">
        ${salary}
        <a class="source-link" href="${t.source_url}" target="_blank" rel="noopener noreferrer"
           onclick="trackExternalJob('${t.id}', ${listPos ?? "null"})">查看來源 →</a>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------------
   Encyclopedia
--------------------------------------------------------------------- */
function roleTechnicalRequirement(profile){
  const skills=(profile?.starter_skills||[])
    .map(skill=>String(skill||"").trim())
    .filter(Boolean)
    .slice(0,3);
  if(skills.length)return `需要 ${skills.join("、")} 能力`;
  const range=String(profile?.tlevel_range||"").toUpperCase();
  if(/T4|T5/.test(range))return "需要機器學習、軟體工程與資料系統能力";
  if(/T3/.test(range))return "需要 SQL、Python／R、統計與實驗分析能力";
  if(/T2/.test(range))return "需要 SQL、BI、指標設計與商業分析能力";
  return "需要試算表、報表、流程分析與溝通能力";
}

const Encyclopedia = {
  _activeIndex: 0,
  _translateX: 0,
  _drag: null,
  _suppressClickUntil: 0,

  render(){
    Encyclopedia.renderCarousel();
    Encyclopedia.renderMap();
  },

  renderCarousel(){
    const profiles = State.careers.meta.family_profiles;
    const viewport = document.getElementById("ency-carousel");
    const entries = Object.entries(profiles);
    viewport.innerHTML = `<div class="ency-track">${entries.map(([famKey, p], index) => `
      <article class="ency-card" style="${famVars(p)}" data-card-index="${index}" data-fam-key="${famKey}" role="button" tabindex="0" aria-label="${index + 1} / ${entries.length}：${p.class_title}，${p.cn_name}。點擊查看完整介紹">
        <div class="ency-card-visual">${portraitHTML(p)}</div>
        <div class="ency-card-copy">
          <span class="eyebrow">角色 ${index + 1} / ${entries.length}</span>
          <div class="ency-rpg" style="color:${p.glow};">${p.class_title}</div>
          <div class="official-zh">${p.cn_name}</div>
          <div class="official-en">${p.en_name || ""}</div>
          <p class="route-oneliner">${p.tagline}</p>
          <div class="tl-chip tech-difficulty"><strong>技術難度：${p.tlevel_range||"—"}</strong><span>${roleTechnicalRequirement(p)}</span></div>
          <button type="button" class="btn btn-ghost route-btn" data-role-detail="${famKey}">認識這個角色</button>
        </div>
      </article>
    `).join("")}</div>`;
    Encyclopedia.bindCarousel();
    Encyclopedia.syncCarousel(Encyclopedia._activeIndex || 0);
    deferFrame(() => deferFrame(() => Encyclopedia.refreshCarousel(false)));
  },

  cards(){
    const viewport = document.getElementById("ency-carousel");
    return viewport ? [...viewport.querySelectorAll(".ency-card")] : [];
  },

  bindCarousel(){
    const viewport = document.getElementById("ency-carousel");
    if (!viewport || typeof viewport.addEventListener !== "function") return;
    if (viewport.dataset && viewport.dataset.bound) return;
    if (viewport.dataset) viewport.dataset.bound = "1";

    // One delegated handler survives rerenders. A simple tap/click always opens
    // the selected role; it no longer requires a first click to center the card.
    viewport.addEventListener("click", event => {
      const card=event.target?.closest?.(".ency-card");
      if(!card||!viewport.contains(card))return;
      if(Date.now()<Encyclopedia._suppressClickUntil){
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      const index=Number(card.dataset.cardIndex);
      if(Number.isInteger(index))Encyclopedia.goTo(index,{animate:true});
      Encyclopedia.openFamily(card.dataset.famKey);
    });

    viewport.addEventListener("keydown", event => {
      const card=event.target?.closest?.(".ency-card");
      if(card&&(event.key==="Enter"||event.key===" ")){
        event.preventDefault();
        const index=Number(card.dataset.cardIndex);
        if(Number.isInteger(index))Encyclopedia.goTo(index,{animate:true});
        Encyclopedia.openFamily(card.dataset.famKey);
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      Encyclopedia.scroll(event.key === "ArrowRight" ? 1 : -1);
    });

    viewport.addEventListener("pointerdown", event => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target?.closest?.("button,a,input,select,textarea")) return;
      const card=event.target?.closest?.(".ency-card");
      if(!card||!viewport.contains(card))return;
      const track = viewport.querySelector(".ency-track");
      if (!track) return;
      Encyclopedia._drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        lastX: event.clientX,
        baseX: Encyclopedia._translateX || 0,
        moved: false,
        card
      };
      viewport.classList.add("is-dragging");
      track.style.transition = "none";
      try { viewport.setPointerCapture(event.pointerId); } catch (_) {}
    });

    viewport.addEventListener("pointermove", event => {
      const drag = Encyclopedia._drag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      drag.lastX = event.clientX;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (!drag.moved) return;
      event.preventDefault();
      const track = viewport.querySelector(".ency-track");
      if (track) track.style.transform = `translate3d(${drag.baseX + dx}px,0,0)`;
    }, { passive:false });

    const finishDrag = event => {
      const drag = Encyclopedia._drag;
      if (!drag || (event.pointerId !== undefined && drag.pointerId !== event.pointerId)) return;
      const dx = drag.lastX - drag.startX;
      const threshold = Math.min(90, Math.max(42, viewport.clientWidth * .12));
      Encyclopedia._drag = null;
      viewport.classList.remove("is-dragging");
      try { viewport.releasePointerCapture(event.pointerId); } catch (_) {}
      if (drag.moved) {
        Encyclopedia._suppressClickUntil = Date.now() + 400;
        if (dx <= -threshold) Encyclopedia.scroll(1);
        else if (dx >= threshold) Encyclopedia.scroll(-1);
        else Encyclopedia.goTo(Encyclopedia._activeIndex, { animate:true });
        return;
      }
      // A genuine tap opens the card on pointerup. This avoids mobile browsers
      // swallowing the later click after a transformed/drag-enabled carousel.
      if(drag.card){
        Encyclopedia._suppressClickUntil = Date.now() + 500;
        const index=Number(drag.card.dataset.cardIndex);
        if(Number.isInteger(index))Encyclopedia.goTo(index,{animate:true});
        Encyclopedia.openFamily(drag.card.dataset.famKey);
      }
    };
    viewport.addEventListener("pointerup", finishDrag);
    viewport.addEventListener("pointercancel", finishDrag);

    viewport.addEventListener("wheel", event => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 18) return;
      event.preventDefault();
      const now = Date.now();
      if (now < (Encyclopedia._wheelLockUntil || 0)) return;
      Encyclopedia._wheelLockUntil = now + 360;
      Encyclopedia.scroll(event.deltaX > 0 ? 1 : -1);
    }, { passive:false });

    if (typeof ResizeObserver === "function") {
      let lastWidth = 0;
      Encyclopedia._resizeObserver = new ResizeObserver(entries => {
        const width = Math.round(entries[0]?.contentRect?.width || 0);
        if (!width || width === lastWidth) return;
        lastWidth = width;
        Encyclopedia.refreshCarousel(false);
      });
      Encyclopedia._resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", () => Encyclopedia.refreshCarousel(false), { passive:true });
    }
  },

  openCard(event, famKey){
    if (Date.now() < Encyclopedia._suppressClickUntil) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      return;
    }
    const index = Number(event?.currentTarget?.dataset?.cardIndex);
    if (Number.isInteger(index)) Encyclopedia.goTo(index, { animate:true });
    Encyclopedia.openFamily(famKey);
  },

  syncCarousel(forcedIndex){
    const cards = Encyclopedia.cards();
    if (!cards.length) return;
    const current = Math.max(0, Math.min(cards.length - 1, Number.isFinite(Number(forcedIndex)) ? Number(forcedIndex) : 0));
    Encyclopedia._activeIndex = current;
    cards.forEach((card,index) => {
      const active = index === current;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-current", active ? "true" : "false");
      card.tabIndex = active ? 0 : -1;
    });
    const pager = document.getElementById("ency-pagination");
    if (pager) pager.innerHTML = cards.map((_, index) => `<button type="button" class="ency-dot ${index===current?"active":""}" aria-label="前往第 ${index+1} 個角色" aria-current="${index===current?"true":"false"}" onclick="Encyclopedia.goTo(${index})"></button>`).join("");
    const viewport = document.getElementById("ency-carousel");
    const deck = viewport?.closest(".ency-deck");
    const arrows = deck ? deck.querySelectorAll(".carousel-arrow") : [];
    if (arrows[0]) arrows[0].disabled = current === 0;
    if (arrows[1]) arrows[1].disabled = current === cards.length - 1;
  },

  prepareCarouselGeometry(){
    const viewport = document.getElementById("ency-carousel");
    if (!viewport || viewport.clientWidth < 40) return false;
    const mobile = window.matchMedia ? window.matchMedia("(max-width: 800px)").matches : viewport.clientWidth < 800;
    const cardWidth = Math.round(Math.min(mobile ? 560 : 720, viewport.clientWidth * (mobile ? .88 : .82)));
    viewport.style.setProperty("--ency-card-width", `${Math.max(250, cardWidth)}px`);
    return true;
  },

  targetTranslate(index){
    const viewport = document.getElementById("ency-carousel");
    const cards = Encyclopedia.cards();
    const card = cards[index];
    if (!viewport || !card) return 0;
    return Math.round(viewport.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2));
  },

  goTo(index, options={}){
    const viewport = document.getElementById("ency-carousel");
    const track = viewport?.querySelector(".ency-track");
    const cards = Encyclopedia.cards();
    if (!viewport || !track || !cards.length) return;
    const next = Math.max(0, Math.min(cards.length - 1, Number(index) || 0));
    Encyclopedia.syncCarousel(next); // active card grows immediately on the same click

    if (!Encyclopedia.prepareCarouselGeometry() || viewport.clientWidth < 40) {
      return; // hidden views are centered once Nav.show makes the viewport measurable
    }

    // Wait one frame after updating the card width so offsetLeft/offsetWidth are final.
    deferFrame(() => {
      const target = Encyclopedia.targetTranslate(next);
      Encyclopedia._translateX = target;
      track.style.transition = options.animate === false ? "none" : "transform .34s cubic-bezier(.2,.75,.25,1)";
      track.style.transform = `translate3d(${target}px,0,0)`;
    });
  },

  refreshCarousel(animate=false){
    const viewport = document.getElementById("ency-carousel");
    if (!viewport || viewport.clientWidth < 40) return;
    Encyclopedia.goTo(Encyclopedia._activeIndex || 0, { animate });
  },

  currentIndex(){ return Encyclopedia._activeIndex || 0; },

  scroll(dir){
    const cards = Encyclopedia.cards();
    if (!cards.length) return;
    const next = Math.max(0, Math.min(cards.length - 1, (Encyclopedia._activeIndex || 0) + Number(dir || 0)));
    if (next === Encyclopedia._activeIndex) return;
    Encyclopedia.goTo(next, { animate:true });
  },

  renderMap(){
    const profiles = State.careers.meta.family_profiles;
    const plot = document.getElementById("spectrum-plot");
    const quadrantLabels = `<span class="quadrant-label q-tl">決策與規劃</span><span class="quadrant-label q-tr">平台與制度</span><span class="quadrant-label q-bl">分析與洞察</span><span class="quadrant-label q-br">產品與執行</span>`;
    plot.innerHTML = quadrantLabels + Object.entries(profiles).map(([famKey, p]) => {
      const mp = p.map_position || { business_technical: 50, insight_automation: 50 };
      const left = 8 + (mp.business_technical / 100) * 84;
      const top = 8 + ((100 - mp.insight_automation) / 100) * 84;
      return `
        <div class="map-node" style="left:${left}%; top:${top}%;" onclick="Encyclopedia.openFamily('${famKey.replace(/'/g,"\\'")}')">
          ${iconDotHTML(p)}
          <div class="map-label">${p.cn_name}</div>
        </div>`;
    }).join("");
  },

  openFamily(famKey){
    openRoleDetail(famKey,"career_guide");
  }
};

/* ---------------------------------------------------------------------
   Modal
--------------------------------------------------------------------- */
const Modal = {
  _lastFocus: null,
  open(html){
    Modal._lastFocus = (typeof document.activeElement === "object") ? document.activeElement : null;
    document.getElementById("modal-body").innerHTML = html;
    document.getElementById("modal-overlay").style.display = "flex";
    if (document.addEventListener) document.addEventListener("keydown", Modal._esc);
    const box = document.querySelector && document.querySelector(".modal-close");
    if (box && box.focus) box.focus();
  },
  close(){
    document.getElementById("modal-overlay").style.display = "none";
    if (document.removeEventListener) document.removeEventListener("keydown", Modal._esc);
    if (Modal._lastFocus && Modal._lastFocus.focus) Modal._lastFocus.focus(); // focus 回到觸發元素
  },
  _esc(e){ if (e.key === "Escape") Modal.close(); }
};

function openRoleDetail(famKey, source="unknown"){
  const profiles=State.careers?.meta?.family_profiles||{};
  if(!famKey||!profiles[famKey]){
    console.warn("Unknown role detail",famKey);
    return false;
  }
  track(APP_EVENTS.ROLE_OPENED, { role_id:famKey, source });
  Modal.open(familyDetailHTML(famKey));
  return true;
}

/* ---------------------------------------------------------------------
   Homepage card fan
   - Randomizes the nine role cards once per page load.
   - Every card is a quiz entry point; it never changes recommendation scores.
--------------------------------------------------------------------- */
const HomeCardFan = {
  picked: false,
  order: [],
  resizeTimer: null,
  randomIndex(max){
    if (max <= 1) return 0;
    try {
      if (window.crypto && typeof window.crypto.getRandomValues === "function") {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return values[0] % max;
      }
    } catch (_) {}
    return Math.floor(Math.random() * max);
  },
  shuffled(entries){
    const result = entries.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.randomIndex(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },
  layoutPreset(){
    const width = Math.max(
      document.documentElement?.clientWidth || 0,
      window.innerWidth || 0
    );

    if (width <= 480) {
      return [
        { x: -74, y: 28, r: -13, s: 0.9, z: 2 },
        { x: 0, y: -8, r: 0, s: 1.04, z: 5 },
        { x: 74, y: 28, r: 13, s: 0.9, z: 2 }
      ];
    }

    if (width <= 800) {
      return [
        { x: -154, y: 40, r: -19, s: 0.88, z: 1 },
        { x: -78, y: 12, r: -9, s: 0.96, z: 3 },
        { x: 0, y: -12, r: 0, s: 1.05, z: 6 },
        { x: 78, y: 12, r: 9, s: 0.96, z: 3 },
        { x: 154, y: 40, r: 19, s: 0.88, z: 1 }
      ];
    }

    return [
      { x: -320, y: 64, r: -27, s: 0.8, z: 1 },
      { x: -242, y: 42, r: -21, s: 0.85, z: 2 },
      { x: -162, y: 22, r: -14, s: 0.9, z: 3 },
      { x: -82, y: 6, r: -7, s: 0.96, z: 4 },
      { x: 0, y: -18, r: 0, s: 1.05, z: 9 },
      { x: 82, y: 6, r: 7, s: 0.96, z: 4 },
      { x: 162, y: 22, r: 14, s: 0.9, z: 3 },
      { x: 242, y: 42, r: 21, s: 0.85, z: 2 },
      { x: 320, y: 64, r: 27, s: 0.8, z: 1 }
    ];
  },
  layout(){
    const mount = document.getElementById("home-card-fan");
    if (!mount) return;

    const cards = Array.from(mount.querySelectorAll(".home-role-card"));
    const preset = this.layoutPreset();

    cards.forEach((card, index) => {
      const slot = preset[index];
      const visible = Boolean(slot);
      card.classList.toggle("is-visible", visible);
      card.hidden = !visible;
      card.setAttribute("aria-hidden", visible ? "false" : "true");
      card.tabIndex = visible ? 0 : -1;
      if (!visible) return;

      card.style.setProperty("--fan-x", `${slot.x}px`);
      card.style.setProperty("--fan-y", `${slot.y}px`);
      card.style.setProperty("--fan-rotation", `${slot.r}deg`);
      card.style.setProperty("--fan-scale", String(slot.s));
      card.style.setProperty("--fan-z", String(slot.z));
    });
  },
  bindResize(){
    if (this.resizeBound) return;
    this.resizeBound = true;
    window.addEventListener("resize", () => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.layout(), 120);
    }, { passive: true });
  },
  render(){
    const mount = document.getElementById("home-card-fan");
    const profiles = State.careers?.meta?.family_profiles || {};
    const entries = Object.entries(profiles);
    if (!mount || !entries.length) return;

    this.picked = false;
    this.order = this.shuffled(entries);
    mount.classList.remove("is-ready", "is-picking");
    mount.replaceChildren();

    const deck = document.createElement("div");
    deck.className = "home-card-fan-deck";

    this.order.forEach(([famKey, profile]) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "home-role-card";
      card.dataset.famKey = famKey;
      card.style.setProperty("--fan-color", profile.color || "#38bdf8");
      card.setAttribute("aria-label", "抽一張卡，開始資料職涯測驗");

      const back = document.createElement("span");
      back.className = "home-role-card-back";
      back.setAttribute("aria-hidden", "true");
      back.innerHTML = [
        '<span class="home-role-card-corner">DM</span>',
        '<span class="home-role-card-mark">◆</span>',
        '<span class="home-role-card-title">DATA MATTERS</span>',
        '<span class="home-role-card-subtitle">FIND YOUR DATA ROLE</span>',
        '<span class="home-role-card-corner home-role-card-corner-bottom">DM</span>'
      ].join("");

      card.appendChild(back);
      card.addEventListener("click", () => this.pick(card));
      deck.appendChild(card);
    });

    mount.appendChild(deck);
    this.layout();
    this.bindResize();
    deferFrame(() => mount.classList.add("is-ready"));
  },
  pick(card){
    if (this.picked || !card || card.hidden) return;
    this.picked = true;
    const mount = document.getElementById("home-card-fan");
    if (mount) mount.classList.add("is-picking");
    card.classList.add("is-picked");
    card.setAttribute("aria-label", "已選擇卡牌，正在開始測驗");

    const reducedMotion = typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(
      () => Nav.startQuiz("landing_card_fan"),
      reducedMotion ? 0 : 320
    );
  }
};

// Inline handlers and the v3 product layer must be able to call these reliably.
Object.assign(window,{
  Encyclopedia,
  Modal,
  Nav,
  Results,
  HomeCardFan,
  DataMattersRoleDetail:{open:openRoleDetail}
});

/* ---------------------------------------------------------------------
   Boot
--------------------------------------------------------------------- */
async function boot(){
  const [careersRes, skillsRes] = await Promise.all([
    fetch("data/careers.json"),
    fetch("data/skills.json")
  ]);
  State.careers = await careersRes.json();
  State.skills = await skillsRes.json();

  Stations.renderAll();
  Encyclopedia.render();
  HomeCardFan.render();

  // landing_viewed：每個 session 僅一次
  try {
    APP_EVENTS.LANDING_VIEWED && window.DMAnalytics && window.DMAnalytics.trackOncePerSession(APP_EVENTS.LANDING_VIEWED, { landing_variant: "default" });
  } catch (e) {}
}

boot().catch(err => {
  console.error("資料載入失敗：", err);
  document.getElementById("home").innerHTML =
    `<p style="color:#ff8080;">資料載入失敗，請確認 data/careers.json 與 data/skills.json 是否存在，或改用本機伺服器開啟（見部署說明）。</p>`;
});
