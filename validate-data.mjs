#!/usr/bin/env node
/**
 * validate-data.mjs — 零依賴資料驗證腳本
 * 用法：node validate-data.mjs
 * 驗證 data/careers.json：必填欄位、meta 參照、ID/URL 唯一性、
 * 數值範圍、技術等級 enum、圖片檔名對照。
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const errors = [];
const warnings = [];

function err(msg){ errors.push(msg); }
function warn(msg){ warnings.push(msg); }

// ── 1. Parse ────────────────────────────────────────────────
let data;
try {
  data = JSON.parse(readFileSync(join(ROOT, "data/careers.json"), "utf8"));
} catch (e) {
  console.error("✗ careers.json 無法解析:", e.message);
  process.exit(1);
}
const meta = data.meta || {};
const profiles = meta.family_profiles || {};
const tracks = data.tracks || [];

const FAMILIES = new Set(meta.job_families || []);
const DOMAINS = new Set(meta.domains || []);
const INDUSTRIES = new Set(meta.industries || []);
const TLEVELS = new Set(Object.keys(meta.technical_levels || {}));

// ── 2. meta 完整性 ───────────────────────────────────────────
["job_families","domains","industries","technical_levels","family_profiles",
 "radar_axes","match_index_note","map_note","domain_notes","source_policy"]
  .forEach(k => { if (!meta[k]) err(`meta 缺少欄位: ${k}`); });
if (FAMILIES.size !== 9) err(`job_families 應為 9 個，實際 ${FAMILIES.size}`);
if (![...TLEVELS].every(t => /^T[1-5]$/.test(t))) err("technical_levels 只允許 T1–T5");

// ── 3. family_profiles ──────────────────────────────────────
const REQUIRED_PROFILE_FIELDS = [
  "icon","cn_name","en_name","spectrum_position","salary_ceiling_rank","technical_stars",
  "color","glow","class_title","class_title_en","class_item","class_lore","radar",
  "tagline","salary_note","career_path","entry_requirements","tip",
  "role_description","representative_titles","daily_tasks","starter_skills",
  "starter_portfolio","internship_titles","next_step","tradeoffs","tlevel_range","map_position"
];
const profileKeys = Object.keys(profiles);
if (profileKeys.length !== 9) err(`family_profiles 應為 9 個，實際 ${profileKeys.length}`);
for (const [famKey, p] of Object.entries(profiles)){
  if (!FAMILIES.has(famKey)) err(`family_profiles 的 key「${famKey}」不在 meta.job_families`);
  for (const f of REQUIRED_PROFILE_FIELDS){
    if (p[f] === undefined || p[f] === null && !["salary_taiwan","salary_source"].includes(f))
      if (p[f] === undefined) err(`${famKey} 缺少欄位: ${f}`);
  }
  if (p.radar && (p.radar.length !== (meta.radar_axes||[]).length || !p.radar.every(v => v>=1 && v<=5)))
    err(`${famKey} radar 長度或數值範圍錯誤（需 ${meta.radar_axes.length} 個 1–5 值）`);
  if (p.technical_stars < 1 || p.technical_stars > 5) err(`${famKey} technical_stars 需為 1–5`);
  if (p.tlevel_range && !/^T[1-5]–T[1-5]$/.test(p.tlevel_range)) err(`${famKey} tlevel_range 格式應為 Tx–Ty，實際「${p.tlevel_range}」`);
  const mp = p.map_position || {};
  if (typeof mp.business_technical !== "number" || mp.business_technical < 0 || mp.business_technical > 100)
    err(`${famKey} map_position.business_technical 需為 0–100`);
  if (typeof mp.insight_automation !== "number" || mp.insight_automation < 0 || mp.insight_automation > 100)
    err(`${famKey} map_position.insight_automation 需為 0–100`);
  for (const arrField of ["representative_titles","daily_tasks","starter_skills","internship_titles","tradeoffs"]){
    const a = p[arrField];
    if (!Array.isArray(a) || a.length < 2 || a.length > 5) err(`${famKey} ${arrField} 需為 2–5 項陣列`);
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(p.color||"")) err(`${famKey} color 需為 hex 色碼`);
  if (!/^#[0-9a-fA-F]{6}$/.test(p.glow||"")) err(`${famKey} glow 需為 hex 色碼`);
  // 圖片路徑（缺圖是 warning，因為前端有 fallback）
  const slug = (p.class_title_en||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  if (!existsSync(join(ROOT, "images", `${slug}.jpg`)) && !existsSync(join(ROOT, "images", `${slug}.png`)))
    warn(`缺少角色圖: images/${slug}.jpg（${p.class_title}，前端將顯示色塊 fallback）`);
}
// map_position 重疊檢查（距離過近會導致地圖標籤重疊）
const positions = Object.entries(profiles).map(([k,p]) => [k, p.map_position]);
for (let i=0;i<positions.length;i++) for (let j=i+1;j<positions.length;j++){
  const [ka,a] = positions[i], [kb,b] = positions[j];
  if (a && b){
    const d = Math.hypot(a.business_technical-b.business_technical, a.insight_automation-b.insight_automation);
    if (d < 10) warn(`地圖位置過近（${d.toFixed(1)}）: ${ka} vs ${kb}`);
  }
}

// ── 4. tracks ───────────────────────────────────────────────
const REQUIRED_TRACK_FIELDS = ["id","job_family","domain","industry","technical_level","title","company","region","what_they_do","salary_note","source_name","source_url","related_skills"];
const ids = new Set(); const urls = new Map();
for (const t of tracks){
  for (const f of REQUIRED_TRACK_FIELDS){
    if (t[f] === undefined) err(`track ${t.id||"?"} 缺少欄位: ${f}`);
  }
  if (ids.has(t.id)) err(`重複的 track id: ${t.id}`); ids.add(t.id);
  if (!FAMILIES.has(t.job_family)) err(`track ${t.id} 的 job_family「${t.job_family}」不在 meta.job_families`);
  if (!DOMAINS.has(t.domain)) err(`track ${t.id} 的 domain「${t.domain}」不在 meta.domains`);
  if (!INDUSTRIES.has(t.industry)) err(`track ${t.id} 的 industry「${t.industry}」不在 meta.industries`);
  if (!TLEVELS.has(t.technical_level)) err(`track ${t.id} 的 technical_level「${t.technical_level}」不是 T1–T5`);
  if (!/^https?:\/\/[^\s]+$/.test(t.source_url||"")) err(`track ${t.id} 的 source_url 格式錯誤`);
  if (urls.has(t.source_url)) err(`重複的 source_url: ${t.source_url}（${urls.get(t.source_url)} / ${t.id}）`);
  urls.set(t.source_url, t.id);
  if (!Array.isArray(t.related_skills) || t.related_skills.length === 0) err(`track ${t.id} related_skills 需為非空陣列`);
}

// domain_notes 覆蓋所有有職缺的領域
const trackDomains = new Set(tracks.map(t => t.domain));
for (const d of trackDomains){
  if (!(meta.domain_notes||{})[d]) warn(`domain_notes 缺少「${d}」的實例說明（該領域已有職缺）`);
}

// ── 5. Report ───────────────────────────────────────────────
console.log(`\ncareers.json 驗證結果`);
console.log(`  角色: ${profileKeys.length}｜職缺: ${tracks.length}`);
const famCount = {};
tracks.forEach(t => famCount[t.job_family] = (famCount[t.job_family]||0)+1);
for (const f of meta.job_families) console.log(`    ${String(famCount[f]||0).padStart(2)} 筆 · ${f}`);
if (warnings.length){
  console.log(`\n⚠ Warnings (${warnings.length}):`);
  warnings.forEach(w => console.log("  - " + w));
}
if (errors.length){
  console.log(`\n✗ Errors (${errors.length}):`);
  errors.forEach(e => console.log("  - " + e));
  process.exit(1);
}
console.log(`\n✓ 驗證通過（0 errors, ${warnings.length} warnings）`);
