const {ALLOWED_USER_TYPES,json,normalizeText,originAllowed,clientMeta,validateNickname,validateContent,supabase,verifyTurnstile,recentRows}=require("./_community-utils");
exports.handler=async(event)=>{
  if(!originAllowed(event))return json(403,{message:"origin_not_allowed"});
  if(event.httpMethod==="OPTIONS")return json(200,{ok:true});
  if(event.httpMethod!=="POST")return json(405,{message:"method_not_allowed"});
  try{
    const body=JSON.parse(event.body||"{}"); const type=body.type==="reply"?"reply":"post";
    if(body.website)return json(400,{message:"blocked_content"});
    if(!body.consent)return json(400,{message:"consent_required"});
    if(!body.form_started_at||Date.now()-Number(body.form_started_at)<2500)return json(400,{message:"submitted_too_fast"});
    if(!(await verifyTurnstile(event,body.turnstile_token)))return json(403,{message:"captcha_failed"});
    const nickname=normalizeText(body.nickname),content=normalizeText(body.content),sessionId=String(body.session_id||"");
    const nickError=validateNickname(nickname);if(nickError)return json(400,{message:nickError});
    const contentError=validateContent(content,type==="post"?10:2,type==="post"?500:300);if(contentError)return json(400,{message:contentError});
    const userType=body.user_type&&ALLOWED_USER_TYPES.has(body.user_type)?body.user_type:null;
    if(type==="reply"&&!/^[0-9a-f-]{36}$/i.test(String(body.post_id||"")))return json(400,{message:"invalid_post"});
    const meta=clientMeta(event,sessionId);
    const now=Date.now(),minute=new Date(now-60_000).toISOString(),tenMin=new Date(now-600_000).toISOString(),day=new Date(now-86_400_000).toISOString();
    const table=type==="post"?"community_posts":"community_replies";
    const [lastMinute,lastTen,lastDay]=await Promise.all([recentRows(table,meta.fingerprintHash,minute),recentRows(table,meta.fingerprintHash,tenMin),recentRows(table,meta.fingerprintHash,day)]);
    const limits=type==="post"?{minute:1,ten:3,day:10}:{minute:2,ten:8,day:20};
    if(lastMinute.length>=limits.minute||lastTen.length>=limits.ten||lastDay.length>=limits.day)return json(429,{message:"rate_limited"});
    if(lastTen.some(r=>normalizeText(r.content)===content))return json(409,{message:"duplicate_content"});
    const row={nickname,user_type:userType,content,status:"visible",session_id:/^[0-9a-f-]{36}$/i.test(sessionId)?sessionId:null,fingerprint_hash:meta.fingerprintHash,ip_hash:meta.ipHash};
    if(type==="post")Object.assign(row,{category:"一般討論",user_agent_hash:meta.uaHash});else row.post_id=body.post_id;
    const inserted=await supabase(table,{method:"POST",body:JSON.stringify(row)});
    return json(201,{ok:true,id:inserted?.[0]?.id});
  }catch(err){console.error(err);return json(err.message==="server_not_configured"?503:500,{message:"submit_failed"});}
};
