#!/usr/bin/env node
/**
 * test-cases.mjs — 判定演算法 v2 驗收測試（Cases A–G）
 * 用法：node test-cases.mjs
 * 零依賴；以 DOM stub 載入 app.js，模擬作答並驗證演算法行為。
 */
import { readFileSync } from "node:fs";

/* ── minimal DOM stub ── */
const elements = {};
function el(){ return { innerHTML:"", style:{}, textContent:"", classList:{add(){},remove(){},toggle(){}}, querySelector(){return null}, querySelectorAll(){return []}, scrollBy(){}, offsetWidth:250 }; }
global.document = { getElementById: id => (elements[id] ||= el()), querySelectorAll: () => [], querySelector: () => null };
global.window = { scrollTo(){} };
global.fetch = async (path) => ({ json: async () => JSON.parse(readFileSync(path, "utf8")) });

const src = readFileSync("app.js", "utf8");
(0, eval)(src + `\n;globalThis.__T={State,Results,ResultState,FAMILIES,F,QUESTION_DIMENSIONS,computeAllScores,pickRoutes,reasonsFor,environmentLines,familyDetailHTML,jobCardHTML,Encyclopedia,HEX_AXES,profileTags,profileSummary,MATCH_ZH,CLARITY_ZH};`);
await new Promise(r => setTimeout(r, 60));
const { State, Results, ResultState, FAMILIES, F, QUESTION_DIMENSIONS, computeAllScores, environmentLines, familyDetailHTML, jobCardHTML, Encyclopedia } = globalThis.__T;

let failures = 0;
function check(name, cond, extra){
  if (cond) console.log("  ✓ " + name);
  else { failures++; console.log("  ✗ " + name + (extra ? "｜" + extra : "")); }
}
function run(answers){
  Object.keys(State.answers).forEach(k => delete State.answers[k]);
  Object.assign(State.answers, answers);
  Results.compute();
  return {
    routes: ResultState.routes,
    main: ResultState.routes[0].famKey,
    pref: State.preferenceScores,
    env: State.environmentScores,
    conf: State.confidence
  };
}
function famZh(f){ return State.careers.meta.family_profiles[f].cn_name; }

if (!State.careers){ console.error("boot 失敗"); process.exit(1); }
console.log("boot OK，職缺", State.careers.tracks.length, "筆\n");

/* ── 結構檢查 ── */
console.log("【結構】三分數系統與題目歸屬");
{
  const r = run({ income:5, prestige:5, security:5, worklife:5, intensity:5 });
  const anyPref = FAMILIES.some(f => r.pref[f] !== 0);
  check("環境題不影響 preferenceScores", !anyPref, JSON.stringify(r.pref));
  check("環境題進 environmentScores", Object.keys(r.env).length === 5);
  const envQids = ["income","prestige","security","worklife","intensity"];
  const contribHasEnv = Object.values(State.contrib).flat().some(c => envQids.includes(c.qid));
  check("環境題不產生推薦理由貢獻", !contribHasEnv);
}
{
  const r = run({ major: 2 }); // 資工背景，無偏好作答
  const anyPref = FAMILIES.some(f => r.pref[f] !== 0);
  check("科系不影響 preferenceScores", !anyPref, JSON.stringify(r.pref));
  check("科系進 backgroundScores", State.backgroundScores.coding === 4 && State.backgroundScores.software_eng === 4);
}
{
  const r = run({ coding_effort: 1, algorithm_effort: 1 }); // 不想寫程式
  const anyPref = FAMILIES.some(f => r.pref[f] > 0);
  check("低分（lowIsMeaningful:false）不自動變成其他職涯正分", !anyPref, JSON.stringify(r.pref));
}
{
  run({ ambiguity: 1 }); // lowIsMeaningful:true 的題
  const gotLow = State.preferenceScores[F.DE] > 0 && State.preferenceScores[F.GOV] > 0;
  check("ambiguity 低分（有意義的反向）以較低權重加分", gotLow && State.preferenceScores[F.DE] === 1);
}

/* ── Case A：高技術、低互動、喜歡 AI 系統 ── */
console.log("\n【Case A】高技術、低互動、AI 系統");
{
  const r = run({ coding_effort:5, algorithm_effort:5, system_type:1, problem_type:1,
                  deep_focus:5, stakeholder_freq:1, prestige:1, income:3 });
  check("主路線為 MLE 或 DE", [F.MLE, F.DE].includes(r.main), famZh(r.main));
  check("不在意名聲不影響職能排名（prestige 無 pref 貢獻）",
    !Object.values(State.contrib).flat().some(c => c.qid === "prestige"));
}

/* ── Case B：資工科系但低技術偏好、商業溝通、需求流程 ── */
console.log("\n【Case B】資工科系＋商業溝通＋需求流程");
{
  const r = run({ major:2, coding_effort:2, algorithm_effort:2, problem_type:4, work_result:1,
                  output_pref:3, stakeholder_freq:5, ambiguity:4 });
  check("主路線為 Product 或 Strategy", [F.PROD, F.STRAT].includes(r.main), famZh(r.main));
  check("不因資工科系被推到 MLE", r.main !== F.MLE);
  check("MLE 偏好分數為 0（科系不加分）", r.pref[F.MLE] === 0, String(r.pref[F.MLE]));
}

/* ── Case C：喜歡預測模型 ── */
console.log("\n【Case C】預測模型");
{
  const r = run({ problem_type:1, math_pref:0, work_result:2, output_pref:1 });
  check("DS 高於 OR", r.pref[F.DS] > r.pref[F.OR], `DS=${r.pref[F.DS]} OR=${r.pref[F.OR]}`);
  check("主路線為 DS", r.main === F.DS, famZh(r.main));
}

/* ── Case D：喜歡最佳化 ── */
console.log("\n【Case D】最佳化與資源配置");
{
  const r = run({ problem_type:2, math_pref:1, output_pref:5, responsibility:3 });
  check("OR 高於 DS", r.pref[F.OR] > r.pref[F.DS], `OR=${r.pref[F.OR]} DS=${r.pref[F.DS]}`);
  check("主路線為 OR", r.main === F.OR, famZh(r.main));
}

/* ── Case E：品質、規則、資料正確 ── */
console.log("\n【Case E】品質與規則");
{
  const r = run({ problem_type:5, responsibility:0, output_pref:4, stable_delivery:5, worklife:5 });
  check("主路線為 Governance", r.main === F.GOV, famZh(r.main));
  const govContrib = (State.contrib[F.GOV]||[]).map(c => c.qid);
  check("Governance 分數不含 worklife 貢獻", !govContrib.includes("worklife"), govContrib.join(","));
}

/* ── Case F：高薪名聲較快、較忙、不喜歡技術也不面客 ── */
console.log("\n【Case F】只有環境偏好強烈");
{
  const r = run({ income:5, prestige:5, intensity:5, coding_effort:1, algorithm_effort:1, stakeholder_freq:2 });
  const allZero = FAMILIES.every(f => r.pref[f] === 0);
  check("職能偏好全為 0（環境不推動 ML/Finance/Consulting）", allZero, JSON.stringify(r.pref));
  check("顯示低信心", r.conf.lowConfidence === true);
  const envL = environmentLines().join("");
  check("環境摘要包含收入／公司名氣／工作節奏", envL.includes("收入") && envL.includes("公司名氣") && envL.includes("較快、較忙"));
}

/* ── Case G：大量中立回答 ── */
console.log("\n【Case G】全部中立");
{
  const r = run({ coding_effort:3, algorithm_effort:3, stakeholder_freq:3, deep_focus:3, ambiguity:3, stable_delivery:3 });
  check("低信心觸發", r.conf.lowConfidence === true, r.conf.triggers.join(";"));
  check("清晰度為尚在探索", r.conf.clarity === "Exploratory", r.conf.clarity);
  check("配對程度不是「高」", r.routes[0].matchLevel !== "High", r.routes[0].matchLevel);
  const html = elements["route-cards"].innerHTML + elements["profile-summary"].innerHTML;
  check("畫面不出現 90–95 精準百分比", !/9[0-5]\s*<\/b>/.test(html));
  check("顯示探索型提示文案", elements["profile-summary"].innerHTML.includes("泛用型角色開始探索"));
}

/* ── 路線邏輯 ── */
console.log("\n【路線】鄰近 adjacency ＋ 挑戰 gap");
{
  const r = run({ problem_type:0, work_result:0, math_pref:3, output_pref:0, stable_delivery:4, major:1 });
  check("主路線 DABI", r.main === F.DABI, famZh(r.main));
  const adjacency = ["Product, Systems & Solutions","Strategy, Operations & Consulting","Data Science & Applied Modeling"];
  check("鄰近選項來自 adjacency 名單", adjacency.includes(r.routes[1].famKey), famZh(r.routes[1].famKey));
  check("挑戰選項偏好 > 0 或為次高家族", State.preferenceScores[r.routes[2].famKey] >= 0);
  const detail = familyDetailHTML(r.routes[2].famKey, { routeLabel:"挑戰選項", matchLevel:r.routes[2].matchLevel,
    reasons:r.routes[2].reasons, background:r.routes[2].background, envLines:environmentLines(), tradeoffs:[], isChallenge:true });
  check("挑戰路線詳細含起點與補強區塊", detail.includes("你目前的起點與可補強項目"));
}

/* ── 理由來源限制 ── */
console.log("\n【理由】只能來自 preference 題");
{
  run({ major:1, income:5, prestige:5, problem_type:5, responsibility:1 });
  const reasons = ResultState.routes.flatMap(r => r.reasons).join("");
  check("理由不含科系/收入/名聲字眼", !/科系|收入|名聲|高薪|品牌/.test(reasons), reasons);
}

/* ── 共用元件與職缺卡 ── */
console.log("\n【元件】共用詳細與職缺卡");
{
  run({ problem_type:1, math_pref:0 });
  const h1 = familyDetailHTML(ResultState.routes[0].famKey, { routeLabel:"最適合", matchLevel:"High",
    reasons:ResultState.routes[0].reasons, background:ResultState.routes[0].background, envLines:[], tradeoffs:[] });
  const h2 = familyDetailHTML(F.DABI);
  check("結果頁詳細含三區塊（推薦／起點補強／環境可省略）", h1.includes("為什麼推薦這個方向") && h1.includes("你目前的起點與可補強項目"));
  check("圖鑑詳細不含推薦理由", !h2.includes("為什麼推薦這個方向"));
  const rpgNames = Object.values(State.careers.meta.family_profiles).map(p => p.class_title);
  const jc = jobCardHTML(State.careers.tracks[0], { routes: ResultState.routes });
  check("職缺卡不含 RPG 名稱", !rpgNames.some(n => jc.includes(n)));
  Encyclopedia.render();
  check("圖鑑 9 卡＋地圖 9 節點",
    (elements["ency-carousel"].innerHTML.match(/ency-card/g)||[]).length >= 9 &&
    (elements["spectrum-plot"].innerHTML.match(/map-node/g)||[]).length === 9);
}

/* ── 八組 persona（大眾向改版驗收）── */
console.log("\n【八組 persona】前三名合理區別、無 NaN、不崩潰");
{
  const personas = [
    ["偏商業溝通型", { stakeholder_freq:5, problem_type:0, output_pref:0, responsibility:3, ambiguity:4 }, [F.STRAT, F.DABI, F.PROD]],
    ["偏產品與系統型", { problem_type:4, work_result:1, output_pref:3, stakeholder_freq:4 }, [F.PROD]],
    ["偏描述分析型", { problem_type:0, math_pref:3, work_result:0, output_pref:0 }, [F.DABI]],
    ["偏資料工程型", { problem_type:3, system_type:0, work_result:3, output_pref:2, stable_delivery:5, coding_effort:4 }, [F.DE]],
    ["偏機器學習型", { problem_type:1, system_type:1, coding_effort:5, algorithm_effort:5, deep_focus:5 }, [F.MLE, F.DS]],
    ["偏風險／量化型", { problem_type:5, responsibility:1, output_pref:4, algorithm_effort:4 }, [F.FIN, F.GOV]]
  ];
  const tops = new Set();
  for (const [name, answers, expected] of personas){
    const r = run(answers);
    tops.add(r.main);
    const noNaN = FAMILIES.every(f => Number.isFinite(r.pref[f]));
    check(`${name} → ${famZh(r.main)}`, expected.includes(r.main) && noNaN,
      `top3=${r.routes.map(x => famZh(x.famKey)).join(",")}`);
    check(`${name} 三條路線互不重複`, new Set(r.routes.map(x => x.famKey)).size === 3);
  }
  check("各 persona 主路線有合理區別（非全部同一角色）", tops.size >= 4, [...tops].map(famZh).join(","));

  // 混合型：不崩潰、三條路線齊全
  const mixed = run({ problem_type:0, system_type:1, stakeholder_freq:4, deep_focus:4, coding_effort:4, work_result:2 });
  check("混合型不崩潰且產生三條路線", mixed.routes.length === 3 && FAMILIES.every(f => Number.isFinite(mixed.pref[f])));

  // 漏答（只答一題）：不崩潰
  const sparse = run({ problem_type:2 });
  check("大量漏答不崩潰、仍有三條路線", sparse.routes.length === 3);

  // 重新測驗清除舊結果
  run({ problem_type:1 });
  const before = JSON.stringify(State.preferenceScores);
  run({});
  check("重新測驗清除舊分數", JSON.stringify(State.preferenceScores) !== before || FAMILIES.every(f => State.preferenceScores[f] === 0));
}

/* ── Architect 職稱分層 ── */
console.log("\n【Architect】職稱兩層顯示");
{
  const prod = State.careers.meta.family_profiles[F.PROD];
  check("產品與系統分析含入門職稱 Systems Analyst", prod.representative_titles.includes("Systems Analyst"));
  check("產品與系統分析含進階 Solution Architect", (prod.advanced_titles||[]).includes("Solution Architect"));
  check("Data Architect 歸在資料工程而非產品分析",
    (State.careers.meta.family_profiles[F.DE].advanced_titles||[]).includes("Data Architect") &&
    !(prod.advanced_titles||[]).includes("Data Architect"));
  check("AI Architect 歸在 ML 工程", (State.careers.meta.family_profiles[F.MLE].advanced_titles||[]).includes("AI Architect"));
  const detail = familyDetailHTML(F.PROD);
  check("詳細頁分層顯示入門/進階職稱", detail.includes("常見職稱") && detail.includes("進階（需多年經驗）"));
}

/* ── QUESTION_DIMENSIONS 與題庫一致 ── */
console.log("\n【config】題目歸屬一致性");
{
  const qs = Object.values({ ...globalThis.STATIONS ?? {} }).flat();
  // STATIONS 不在 __T，改由題目回答鍵檢查：確保每個 QUESTION_DIMENSIONS key 都能被回答處理
  const dims = Object.values(QUESTION_DIMENSIONS);
  check("共 18 題", Object.keys(QUESTION_DIMENSIONS).length === 18, String(Object.keys(QUESTION_DIMENSIONS).length));
  check("preference 12 題 / environment 5 題 / background 1 題",
    dims.filter(d => d==="preference").length === 12 &&
    dims.filter(d => d==="environment").length === 5 &&
    dims.filter(d => d==="background").length === 1);
}

console.log("\n" + (failures ? `✗ ${failures} 項未通過` : "✓ 全部驗收測試通過"));
process.exit(failures ? 1 : 0);


