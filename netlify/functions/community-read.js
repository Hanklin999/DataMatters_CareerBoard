const {json,supabase,originAllowed}=require("./_community-utils");

async function readFromViews(sort){
  const posts=await supabase(`public_visible_community_posts?select=id,created_at,nickname,user_type,content,reply_count,is_pinned&order=${sort}&limit=50`);
  const ids=(posts||[]).map(p=>p.id);
  let replies=[];
  if(ids.length){
    replies=await supabase(`public_visible_community_replies?select=id,post_id,created_at,nickname,user_type,content&post_id=in.(${ids.join(",")})&order=created_at.asc&limit=250`);
  }
  return {posts,replies,source:"views"};
}

async function readFromBaseTables(sort){
  const posts=await supabase(`community_posts?select=id,created_at,nickname,user_type,content,reply_count,is_pinned&status=eq.visible&order=${sort}&limit=50`);
  const ids=(posts||[]).map(p=>p.id);
  let replies=[];
  if(ids.length){
    replies=await supabase(`community_replies?select=id,post_id,created_at,nickname,user_type,content&status=eq.visible&post_id=in.(${ids.join(",")})&order=created_at.asc&limit=250`);
  }
  return {posts,replies,source:"base_tables"};
}

function group(posts,replies){
  const grouped=new Map();
  (replies||[]).forEach(reply=>{
    if(!grouped.has(reply.post_id))grouped.set(reply.post_id,[]);
    grouped.get(reply.post_id).push(reply);
  });
  return (posts||[]).map(post=>({...post,replies:grouped.get(post.id)||[]}));
}

exports.handler=async(event)=>{
  if(!originAllowed(event))return json(403,{message:"origin_not_allowed"});
  if(event.httpMethod!="GET")return json(405,{message:"method_not_allowed"});
  const sort=event.queryStringParameters?.sort==="replies"?"reply_count.desc,created_at.desc":"created_at.desc";
  try{
    let result;
    try{
      result=await readFromViews(sort);
    }catch(viewError){
      if(!["relation_missing","permission_denied","database_error"].includes(viewError.code))throw viewError;
      console.warn("Community public views unavailable; falling back to selected visible fields from base tables.",viewError.code);
      result=await readFromBaseTables(sort);
    }
    return json(200,{posts:group(result.posts,result.replies),source:result.source});
  }catch(err){
    console.error("Community read failed",err.code||err.message);
    const message=err.code==="server_not_configured"
      ? "server_not_configured"
      : err.code==="relation_missing"
        ? "community_schema_missing"
        : err.code==="permission_denied"
          ? "community_permission_missing"
          : "community_unavailable";
    return json(503,{message});
  }
};
