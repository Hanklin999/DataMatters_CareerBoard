const crypto = require("crypto");

const ALLOWED_USER_TYPES = new Set(["高中生","大學生","研究生","轉職中","在職","其他"]);
const REPORT_REASONS = new Set(["垃圾訊息","不當內容","人身攻擊","洩露個人資料","廣告或詐騙","其他"]);
const PII_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:\+?886[-\s]?)?0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/,
  /\b[A-Z][12]\d{8}\b/i,
  /https?:\/\/|www\./i,
  /(?:台|臺)?(?:北|中|南|東)?(?:市|縣|區|鄉|鎮).{0,18}(?:路|街|巷|弄)\s*\d{1,4}(?:號|樓)/
];
const BLOCK_PATTERNS = [
  /(?:加我|私訊我|聯絡我).{0,12}(?:line|telegram|微信|whatsapp)/i,
  /(?:保證獲利|快速致富|代操|借款|博弈|援交|色情服務|投資群組)/i,
  /(?:去死|垃圾人|低能|智障|仇恨|納粹|種族清洗)/i,
  /(?:招募代理|兼職日領|在家工作).{0,15}(?:私訊|加line|加賴)/i,
  /(.)\1{14,}/
];

function json(statusCode, body){
  return { statusCode, headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"}, body:JSON.stringify(body) };
}
function normalizeText(value){ return String(value || "").replace(/\r\n/g,"\n").trim(); }
function originAllowed(event){
  const origin=(event.headers||{}).origin||(event.headers||{}).Origin;
  if(!origin)return true;
  const configured=(process.env.COMMUNITY_ALLOWED_ORIGINS||"https://datamatters-hanks-career-board.netlify.app,http://localhost:8888").split(",").map(v=>v.trim()).filter(Boolean);
  return configured.includes(origin);
}
function firstEnv(names){
  for(const name of names){
    const value=String(process.env[name]||"").trim();
    if(value)return value;
  }
  return "";
}
function serverKey(){
  return firstEnv(["SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SECRET_KEY"]);
}
function communityConfigStatus(){
  const url=firstEnv(["SUPABASE_URL","VITE_SUPABASE_URL"]);
  const key=serverKey();
  const explicitSalt=firstEnv(["COMMUNITY_HASH_SALT"]);
  const salt=explicitSalt || key;
  const missing=[];
  const invalid=[];
  if(!url)missing.push("SUPABASE_URL_OR_VITE_SUPABASE_URL");
  else{
    try{
      const parsed=new URL(url);
      const cleanPath=parsed.pathname.replace(/\/+$/," ").trim();
      if(parsed.protocol!=="https:"||!/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)||cleanPath!==""||parsed.search||parsed.hash)invalid.push("SUPABASE_URL_INVALID");
    }catch(_){invalid.push("SUPABASE_URL_INVALID");}
  }
  if(!key)missing.push("SUPABASE_SERVICE_ROLE_KEY_OR_SECRET_KEY");
  if(!salt)missing.push("COMMUNITY_HASH_SALT");
  else if(salt.length<32)invalid.push("COMMUNITY_HASH_SALT_MIN_32_CHARS");
  return {
    configured:missing.length===0&&invalid.length===0,missing,invalid,
    urlSource:process.env.SUPABASE_URL?"SUPABASE_URL":process.env.VITE_SUPABASE_URL?"VITE_SUPABASE_URL":null,
    keySource:process.env.SUPABASE_SERVICE_ROLE_KEY?"SUPABASE_SERVICE_ROLE_KEY":process.env.SUPABASE_SECRET_KEY?"SUPABASE_SECRET_KEY":null,
    saltSource:explicitSalt?"COMMUNITY_HASH_SALT":key?"SERVER_KEY_FALLBACK":null
  };
}
function configurationError(){
  const error=new Error("server_not_configured");
  error.code="server_not_configured";
  const status=communityConfigStatus();
  error.missing=status.missing;
  error.invalid=status.invalid;
  return error;
}
function hash(value){
  const salt=firstEnv(["COMMUNITY_HASH_SALT"]) || serverKey();
  if(!salt||salt.length<32)throw configurationError();
  return crypto.createHmac("sha256",salt).update(String(value || "unknown")).digest("hex");
}
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
function supabaseBaseUrl(){
  try{
    const raw=firstEnv(["SUPABASE_URL","VITE_SUPABASE_URL"]);
    const parsed=new URL(raw);
    const cleanPath=parsed.pathname.replace(/\/+$/,"");
    if(parsed.protocol!=="https:"||!/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)||cleanPath!==""||parsed.search||parsed.hash)throw new Error();
    return parsed.origin;
  }catch(_){throw configurationError();}
}
function supabaseHeaders(){
  const key=serverKey();
  if(!key)throw configurationError();
  const headers={apikey:key,"Content-Type":"application/json",Prefer:"return=representation"};
  // Modern sb_secret_* keys are opaque API keys, not JWTs. Supabase requires
  // them in the apikey header only; legacy service_role JWTs also use Bearer.
  if(!key.startsWith("sb_secret_"))headers.Authorization=`Bearer ${key}`;
  return headers;
}
async function supabase(path, options={}){
  const res=await fetch(`${supabaseBaseUrl()}/rest/v1/${path}`,{...options,headers:{...supabaseHeaders(),...(options.headers||{})}});
  const text=await res.text(); let data=null; try{data=text?JSON.parse(text):null;}catch(_){data=text;}
  if(!res.ok){
    console.error("Supabase community error",res.status,data);
    const pgCode=data&&typeof data==="object"?data.code:null;
    const error=new Error("database_error");
    error.status=res.status;
    error.details=data;
    error.pgCode=pgCode;
    error.code=pgCode==="42P01"?"relation_missing":pgCode==="42501"?"permission_denied":"database_error";
    throw error;
  }
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
module.exports={ALLOWED_USER_TYPES,REPORT_REASONS,json,normalizeText,originAllowed,clientMeta,validateNickname,validateContent,supabase,verifyTurnstile,recentRows,communityConfigStatus,supabaseBaseUrl,supabaseHeaders};
