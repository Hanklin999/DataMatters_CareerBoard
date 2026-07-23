#!/usr/bin/env node
/**
 * Data Matters v3.14 matching acceptance tests.
 * Replace the repository's test-cases.mjs with this file.
 * Run: node test-cases.mjs
 */
import { readFileSync } from "node:fs";

const elements = {};
function makeClassList(){
  const values = new Set();
  return {
    add(...xs){ xs.forEach(x => values.add(x)); },
    remove(...xs){ xs.forEach(x => values.delete(x)); },
    toggle(x, force){
      if (force === true) { values.add(x); return true; }
      if (force === false) { values.delete(x); return false; }
      if (values.has(x)) { values.delete(x); return false; }
      values.add(x); return true;
    },
    contains(x){ return values.has(x); }
  };
}
function el(){
  return {
    innerHTML: "", textContent: "", value: "", checked: false,
    children: [], dataset: {}, attributes: {},
    style: { setProperty(){}, removeProperty(){} },
    classList: makeClassList(),
    clientWidth: 320, offsetWidth: 250, scrollLeft: 0,
    appendChild(node){ this.children.push(node); return node; },
    append(...nodes){ this.children.push(...nodes); },
    replaceChildren(...nodes){ this.children = nodes; this.innerHTML = ""; },
    remove(){}, focus(){}, click(){},
    setAttribute(k,v){ this.attributes[k] = String(v); },
    getAttribute(k){ return this.attributes[k] ?? null; },
    removeAttribute(k){ delete this.attributes[k]; },
    addEventListener(){}, removeEventListener(){},
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    closest(){ return null; },
    scrollBy(){}, scrollTo(){},
    getBoundingClientRect(){ return { left:0, top:0, width:250, height:250, right:250, bottom:250 }; }
  };
}

global.document = {
  getElementById: id => (elements[id] ||= el()),
  querySelectorAll: () => [], querySelector: () => null,
  createElement: () => el(),
  body: el(), documentElement: el(),
  addEventListener(){}, removeEventListener(){}
};
global.window = {
  scrollTo(){}, addEventListener(){}, removeEventListener(){},
  setTimeout, clearTimeout,
  matchMedia(){ return { matches:false, addEventListener(){}, removeEventListener(){} }; },
  location: { href:"http://localhost/", origin:"http://localhost", pathname:"/", search:"", hash:"" },
  history: { pushState(){}, replaceState(){} },
  crypto: globalThis.crypto
};
global.navigator = { userAgent:"node-test", share:undefined, clipboard:{ writeText: async()=>{} } };
global.requestAnimationFrame = fn => { fn(Date.now()); return 1; };
global.cancelAnimationFrame = () => {};
global.getComputedStyle = () => ({ getPropertyValue(){ return ""; } });
global.fetch = async path => ({
  ok: true,
  json: async () => JSON.parse(readFileSync(path, "utf8"))
});

const src = readFileSync("app.js", "utf8");
(0, eval)(src + `
;globalThis.__T={
 State,ResultState,FAMILIES,F,QUESTION_DIMENSIONS,STATIONS,
 resetState,computeAllScores,pickRoutes,rankFamilies,
 calibratedRoleScore,maxPossiblePreferenceScore,roleEvidenceCount,
 reasonsFor,environmentLines,familyDetailHTML,jobCardHTML,Encyclopedia
};`);
await new Promise(resolve => setTimeout(resolve, 100));

const T = globalThis.__T;
const { State, FAMILIES, F, QUESTION_DIMENSIONS, STATIONS } = T;
let failures = 0;
function check(name, condition, extra=""){
  if (condition) console.log("  ✓ " + name);
  else { failures += 1; console.log("  ✗ " + name + (extra ? "｜" + extra : "")); }
}
function famZh(fam){ return State.careers?.meta?.family_profiles?.[fam]?.cn_name || fam; }
function run(answers){
  T.resetState();
  Object.assign(State.answers, answers);
  T.computeAllScores();
  const keys = T.pickRoutes();
  const routeKeys = [keys.main, keys.near, keys.challenge];
  return {
    main: keys.main,
    routeKeys,
    raw: { ...State.preferenceScores },
    calibrated: Object.fromEntries(FAMILIES.map(f => [f, T.calibratedRoleScore(f)])),
    evidence: Object.fromEntries(FAMILIES.map(f => [f, T.roleEvidenceCount(f)])),
    confidence: State.confidence
  };
}

if (!State.careers){
  console.error("boot 失敗：無法載入 data/careers.json");
  process.exit(1);
}
console.log(`boot OK，職缺 ${State.careers.tracks.length} 筆\n`);

console.log("【題庫結構】18 題、三套分數、每題最多五個選項");
{
  const questions = Object.values(STATIONS).flat();
  const dims = Object.values(QUESTION_DIMENSIONS);
  check("共 18 題", questions.length === 18, String(questions.length));
  check("preference 12／environment 5／background 1",
    dims.filter(x=>x==="preference").length === 12 &&
    dims.filter(x=>x==="environment").length === 5 &&
    dims.filter(x=>x==="background").length === 1);
  const oversized = questions.filter(q => q.type === "single" && q.options.length > 5);
  check("所有單選題最多五個選項", oversized.length === 0, oversized.map(q=>q.id).join(","));
  check("所有題目 ID 唯一", new Set(questions.map(q=>q.id)).size === questions.length);
}

console.log("\n【隔離性】背景與環境不得改變職涯排名");
{
  const env = run({ income:5, prestige:5, security:5, worklife:5, intensity:5 });
  check("環境題不改變 raw preference", FAMILIES.every(f => env.raw[f] === 0));
  check("環境題完整進 environmentScores", Object.keys(State.environmentScores).length === 5);
  const bg = run({ major:2 });
  check("科系不改變 raw preference", FAMILIES.every(f => bg.raw[f] === 0));
  check("科系只建立起點", State.backgroundScores.coding === 4 && State.backgroundScores.software_eng === 4);
  const low = run({ coding_effort:1, algorithm_effort:1 });
  check("不喜歡技術不會自動推向其他角色", FAMILIES.every(f => low.raw[f] === 0));
  const opposite = run({ ambiguity:1 });
  check("只有 ambiguity 的低端具有明確反向意義", opposite.raw[F.DE] > 0 && opposite.raw[F.GOV] > 0);
}

console.log("\n【校準】不同角色的可得分上限被正規化");
{
  const maxima = Object.fromEntries(FAMILIES.map(f => [f, T.maxPossiblePreferenceScore(f)]));
  check("每個角色都有正的理論上限", FAMILIES.every(f => Number.isFinite(maxima[f]) && maxima[f] > 0));
  const ratio = Math.max(...Object.values(maxima)) / Math.min(...Object.values(maxima));
  check("理論上限差距受控（最大／最小 < 1.7）", ratio < 1.7, ratio.toFixed(3));
  const sparse = run({ problem_type:0 });
  check("少量作答仍能產生三條不重複路線", sparse.routeKeys.length === 3 && new Set(sparse.routeKeys).size === 3);
  check("少量作答標為低信心", sparse.confidence.lowConfidence === true);
}

const PERSONAS = {
  DABI: { expected:F.DABI, answers:{ problem_type:0, system_type:2, math_pref:0, work_result:0, output_pref:0, responsibility:4, coding_effort:2, algorithm_effort:2, stakeholder_freq:5, deep_focus:3, ambiguity:2, stable_delivery:5 } },
  DS: { expected:F.DS, answers:{ problem_type:1, system_type:1, math_pref:1, work_result:2, output_pref:1, responsibility:2, coding_effort:5, algorithm_effort:5, stakeholder_freq:2, deep_focus:5, ambiguity:5, stable_delivery:3 } },
  MLE: { expected:F.MLE, answers:{ problem_type:1, system_type:1, math_pref:1, work_result:2, output_pref:2, responsibility:2, coding_effort:5, algorithm_effort:5, stakeholder_freq:2, deep_focus:5, ambiguity:4, stable_delivery:5 } },
  DE: { expected:F.DE, answers:{ problem_type:0, system_type:0, math_pref:0, work_result:3, output_pref:2, responsibility:2, coding_effort:5, algorithm_effort:3, stakeholder_freq:2, deep_focus:5, ambiguity:1, stable_delivery:5 } },
  OR: { expected:F.OR, answers:{ problem_type:2, system_type:2, math_pref:3, work_result:4, output_pref:4, responsibility:1, coding_effort:4, algorithm_effort:5, stakeholder_freq:3, deep_focus:5, ambiguity:5, stable_delivery:3 } },
  STRAT: { expected:F.STRAT, answers:{ problem_type:2, system_type:3, math_pref:4, work_result:1, output_pref:0, responsibility:4, coding_effort:2, algorithm_effort:3, stakeholder_freq:5, deep_focus:3, ambiguity:5, stable_delivery:2 } },
  PROD: { expected:F.PROD, answers:{ problem_type:3, system_type:3, math_pref:2, work_result:1, output_pref:3, responsibility:3, coding_effort:3, algorithm_effort:3, stakeholder_freq:5, deep_focus:3, ambiguity:5, stable_delivery:3 } },
  FIN: { expected:F.FIN, answers:{ problem_type:4, system_type:4, math_pref:4, work_result:4, output_pref:4, responsibility:1, coding_effort:3, algorithm_effort:4, stakeholder_freq:4, deep_focus:4, ambiguity:2, stable_delivery:5 } },
  GOV: { expected:F.GOV, answers:{ problem_type:4, system_type:4, math_pref:0, work_result:3, output_pref:2, responsibility:0, coding_effort:3, algorithm_effort:2, stakeholder_freq:3, deep_focus:4, ambiguity:1, stable_delivery:5 } }
};

console.log("\n【九種角色】代表 persona 應回到對應職涯");
for (const [name, persona] of Object.entries(PERSONAS)){
  const result = run(persona.answers);
  check(`${name} → ${famZh(result.main)}`, result.main === persona.expected,
    `top3=${result.routeKeys.map(famZh).join("、")}`);
  check(`${name} 三條路線不重複`, new Set(result.routeKeys).size === 3);
  check(`${name} 分數皆為有限值`, FAMILIES.every(f => Number.isFinite(result.raw[f]) && Number.isFinite(result.calibrated[f])));
}

console.log("\n【穩定性】單一答案變動不應造成不合理翻轉");
{
  const prefQuestions = Object.values(STATIONS).flat().filter(q => q.system === "preference");
  for (const [name, persona] of Object.entries(PERSONAS)){
    let total = 0, primary = 0, top3 = 0;
    for (const q of prefQuestions){
      const values = q.type === "single" ? q.options.map((_,i)=>i) : [1,2,3,4,5];
      for (const value of values){
        if (value === persona.answers[q.id]) continue;
        const result = run({ ...persona.answers, [q.id]:value });
        total += 1;
        if (result.main === persona.expected) primary += 1;
        if (result.routeKeys.includes(persona.expected)) top3 += 1;
      }
    }
    const primaryRate = primary / total;
    const top3Rate = top3 / total;
    check(`${name} 主結果保留率至少 95%`, primaryRate >= 0.95, (primaryRate*100).toFixed(1)+"%");
    check(`${name} 前三名保留率 100%`, top3Rate === 1, (top3Rate*100).toFixed(1)+"%");
  }
}

console.log("\n【內容相關性】理由只能來自偏好題");
{
  run({ major:1, income:5, prestige:5, problem_type:4, responsibility:1 });
  const reasons = FAMILIES.flatMap(f => T.reasonsFor(f)).join("");
  check("推薦理由不含科系、收入或公司名氣", !/科系|收入|高薪|公司名氣|品牌/.test(reasons), reasons);
  const envText = T.environmentLines().join("");
  check("環境偏好仍能獨立呈現", envText.includes("收入") && envText.includes("公司名氣"));
}

console.log("\n【元件】結果與圖鑑共用內容仍可產生");
{
  const result = run(PERSONAS.DABI.answers);
  const detail = T.familyDetailHTML(result.main, {
    routeLabel:"最適合", matchLevel:"High", reasons:T.reasonsFor(result.main),
    background:{ advantages:[], gaps:[] }, envLines:[], tradeoffs:[]
  });
  check("結果詳情包含推薦與起點補強", detail.includes("為什麼推薦這個方向") && detail.includes("你目前的起點與可補強項目"));
  const atlasDetail = T.familyDetailHTML(F.DABI);
  check("圖鑑詳情不冒充個人推薦", !atlasDetail.includes("為什麼推薦這個方向"));
  const card = T.jobCardHTML(State.careers.tracks[0], { routes:[] });
  check("職缺卡可正常產生", typeof card === "string" && card.length > 20);
}

console.log("\n" + (failures ? `✗ ${failures} 項未通過` : "✓ v3.14 全部驗收測試通過"));
process.exit(failures ? 1 : 0);
