/* Anonymous Supabase analytics client. No names, messages, emails or full answer sets. */
(() => {
  "use strict";
  const cfg=window.ANALYTICS_CONFIG||{};
  const enabled=Boolean(cfg.ANALYTICS_ENABLED&&/^https:\/\//.test(cfg.SUPABASE_URL||"")&&cfg.SUPABASE_ANON_KEY&&!String(cfg.SUPABASE_ANON_KEY).startsWith("__"));
  const DENY_KEYS=/content|message|nickname|email|phone|address|full_answer|answer_text|ip|fingerprint/i;
  const COLUMN_KEYS=new Set(["quiz_step","role_id","recommendation_rank","domain_id","industry_id","job_id","company_name","accuracy_rating","clarity_before","clarity_after","preferred_role_id"]);
  const sessionId=(()=>{try{let id=sessionStorage.getItem("dm_session_id");if(!id){id=crypto.randomUUID();sessionStorage.setItem("dm_session_id",id);}return id;}catch(_){return crypto.randomUUID();}})();
  const onceSession=new Set(); const onceRun=new Set();
  const params=new URLSearchParams(location.search);
  const environment=cfg.ANALYTICS_ENV||(location.hostname==="localhost"||location.hostname==="127.0.0.1"?"local":location.hostname.includes("--")?"deploy_preview":"production");
  function device(){const w=window.innerWidth;return w<768?"mobile":w<1100?"tablet":"desktop";}
  function cleanValue(v){if(v===undefined||v===null)return undefined;if(typeof v==="string")return v.slice(0,200);if(typeof v==="number"||typeof v==="boolean")return v;if(Array.isArray(v))return v.slice(0,10).map(cleanValue);return undefined;}
  function cleanProperties(input){const out={environment,scoring_version:cfg.SCORING_VERSION||"v2"};Object.entries(input||{}).forEach(([k,v])=>{if(DENY_KEYS.test(k)||COLUMN_KEYS.has(k))return;const c=cleanValue(v);if(c!==undefined)out[k]=c;});return out;}
  async function send(name,input){
    if(!enabled||!name)return false;
    const row={occurred_at:new Date().toISOString(),session_id:sessionId,event_name:String(name).slice(0,80),page_path:location.pathname+location.hash,app_version:cfg.APP_VERSION||"v3",device_type:device(),referrer_domain:(()=>{try{return document.referrer?new URL(document.referrer).hostname:null}catch(_){return null}})(),utm_source:params.get("utm_source"),utm_medium:params.get("utm_medium"),utm_campaign:params.get("utm_campaign"),properties:cleanProperties(input)};
    Object.entries(input||{}).forEach(([k,v])=>{if(COLUMN_KEYS.has(k)&&!DENY_KEYS.test(k)){const c=cleanValue(v);if(c!==undefined)row[k]=c;}});
    try{
      if(cfg.ANALYTICS_DEBUG)console.info("[DM analytics]",row);
      const res=await fetch(`${cfg.SUPABASE_URL}/rest/v1/analytics_events`,{method:"POST",keepalive:true,headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(row)});
      return res.ok;
    }catch(_){return false;}
  }
  window.DMAnalytics={environment,sessionId,track:(name,payload)=>{void send(name,payload);},trackOncePerSession:(key,name,payload)=>{if(onceSession.has(key))return;onceSession.add(key);void send(name,payload);},trackOncePerRun:(key,name,payload)=>{if(onceRun.has(key))return;onceRun.add(key);void send(name,payload);},resetRun:()=>onceRun.clear()};
})();
