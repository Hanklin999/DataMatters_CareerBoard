const {json,supabase,originAllowed}=require("./_community-utils");
exports.handler=async(event)=>{
  if(!originAllowed(event))return json(403,{message:"origin_not_allowed"});
  if(event.httpMethod!=="GET")return json(405,{message:"method_not_allowed"});
  try{
    const sort=event.queryStringParameters?.sort==="replies"?"reply_count.desc,created_at.desc":"created_at.desc";
    const posts=await supabase(`public_visible_community_posts?select=*&order=${sort}&limit=50`);
    const ids=(posts||[]).map(p=>p.id);
    let replies=[];
    if(ids.length){replies=await supabase(`public_visible_community_replies?select=*&post_id=in.(${ids.join(",")})&order=created_at.asc&limit=250`);}
    const grouped=new Map();(replies||[]).forEach(r=>{if(!grouped.has(r.post_id))grouped.set(r.post_id,[]);grouped.get(r.post_id).push(r);});
    return json(200,{posts:(posts||[]).map(p=>({...p,replies:grouped.get(p.id)||[]}))});
  }catch(err){console.error(err);return json(503,{message:"community_unavailable"});}
};
