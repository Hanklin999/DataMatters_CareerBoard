const crypto = require("crypto");

const ALLOWED_CATEGORIES = new Set(["職涯方向","科系與課程","實習與求職","技能學習","網站建議"]);
const ALLOWED_USER_TYPES = new Set(["高中生","大學生","研究生","轉職中","在職","其他"]);
const REPORT_REASONS = new Set(["垃圾訊息","不當內容","人身攻擊","洩露個人資料","廣告或詐騙","其他"]);
const PII_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:\+?886[-\s]?)?0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/,
  /\b[A-Z][12]\d{8}\b/i,
  /https?:\/\/|www\./i
];
const BLOCK_PATTERNS = [
  /(?:加我|私訊我|聯絡我).{0,10}(?:line|telegram|微信|whatsapp)/i,
  /(?:保證獲利|快速致富|代操|借款|博弈|色情|援交)/i,
  /(.)\1{14,}/
];

function json(statusCode, body){
  return { statusCode, headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}, body:JSON.stringify(body) };
}
function normalizeText(value){ return String(value || "").replace(/\r\n/g,"\n").trim(); }
function originAllowed(event){
  const origin=(event.headers||{}).origin||(event.headers||{}).Origin;
  if(!origin)return true;
  const configured=(process.env.COMMUNITY_ALLOWED_ORIGINS||"https://datamatters-hanks-career-board.netlify.app,http://localhost:8888").split(",").map(v=>v.trim()).filter(Boolean);
  return configured.includes(origin);
}
function hash(value){ const salt=process.env.COMMUNITY_HASH_SALT;if(!salt||salt.length<32)throw new Error("server_not_configured");return crypto.createHash("sha256").update(`${salt}:${value || "unknown"}`).digest("hex"); }
function clientMeta(event, sessionId){
  const headers = event.headers || {};
  const ip = headers["x-nf-client-connection-ip"] || String(headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const ua = headers["user-agent"] || "unknown";
  return { fingerprintHash:hash(`${ip}|${ua}|${sessionId || "none"}`), ipHash:hash(ip), uaHash:hash(ua) };
}
function validateNickname(value){
  const v=normalizeText(value); if(v.length<2||v.length>20)return "invalid_nickname";
  if(PII_PATTERNS.some(r=>r.test(v))||/@|\d{8,}/.test(v))return "personal_data"; return null;
}
function validateContent(value,min,max){
  const v=normalizeText(value); if(v.length<min||v.length>max)return "invalid_content";
  if(/<[^>]+>|\[[^\]]+\]\([^\)]+\)/.test(v))return "invalid_format";
  if(PII_PATTERNS.some(r=>r.test(v)))return "personal_data";
  if(BLOCK_PATTERNS.some(r=>r.test(v)))return "blocked_content";
  return null;
}
function supabaseHeaders(){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!process.env.SUPABASE_URL||!key)throw new Error("server_not_configured");
  return { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":"application/json", Prefer:"return=representation" };
}
async function supabase(path, options={}){
  const res=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`,{...options,headers:{...supabaseHeaders(),...(options.headers||{})}});
  const text=await res.text(); let data=null; try{data=text?JSON.parse(text):null;}catch(_){data=text;}
  if(!res.ok){console.error("Supabase community error",res.status,data);throw new Error("database_error");}
  return data;
}
async function verifyTurnstile(event, token){
  if(!process.env.TURNSTILE_SECRET_KEY)return true;
  if(!token)return process.env.COMMUNITY_REQUIRE_TURNSTILE !== "true";
  const ip=(event.headers||{})["x-nf-client-connection-ip"] || "";
  const body=new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token,remoteip:ip});
  const res=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body});
  const data=await res.json(); return Boolean(data.success);
}
async function recentRows(table,fingerprintHash,sinceIso,select="created_at,content"){
  const q=`${table}?select=${encodeURIComponent(select)}&fingerprint_hash=eq.${fingerprintHash}&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc`;
  return await supabase(q);
}
module.exports={ALLOWED_CATEGORIES,ALLOWED_USER_TYPES,REPORT_REASONS,json,normalizeText,originAllowed,clientMeta,validateNickname,validateContent,supabase,verifyTurnstile,recentRows};
