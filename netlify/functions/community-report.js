const {REPORT_REASONS,json,normalizeText,originAllowed,clientMeta,validateContent,supabase}=require("./_community-utils");
exports.handler=async(event)=>{
  if(!originAllowed(event))return json(403,{message:"origin_not_allowed"});
  if(event.httpMethod!=="POST")return json(405,{message:"method_not_allowed"});
  try{
    const body=JSON.parse(event.body||"{}");const targetType=body.target_type;const targetId=String(body.target_id||"");const reason=body.reason;
    if(!["post","reply"].includes(targetType)||!/^[0-9a-f-]{36}$/i.test(targetId)||!REPORT_REASONS.has(reason))return json(400,{message:"invalid_report"});
    const sessionId=String(body.session_id||"");const validSession=/^[0-9a-f-]{36}$/i.test(sessionId)?sessionId:null;const meta=clientMeta(event,validSession);
    const detail=normalizeText(body.detail).slice(0,200);if(detail){const detailError=validateContent(detail,2,200);if(detailError)return json(400,{message:detailError});}
    const existing=await supabase(`community_reports?select=id&target_type=eq.${targetType}&target_id=eq.${targetId}&fingerprint_hash=eq.${meta.fingerprintHash}&limit=1`);
    if(existing.length)return json(200,{ok:true,duplicate:true});
    await supabase("community_reports",{method:"POST",body:JSON.stringify({target_type:targetType,target_id:targetId,reason,detail:detail||null,session_id:validSession,fingerprint_hash:meta.fingerprintHash,status:"open"})});
    return json(201,{ok:true});
  }catch(err){console.error(err);return json(500,{message:"report_failed"});}
};
