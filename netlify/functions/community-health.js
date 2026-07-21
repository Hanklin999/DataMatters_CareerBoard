const {json,originAllowed,communityConfigStatus,supabase}=require("./_community-utils");

exports.handler=async(event)=>{
  if(!originAllowed(event))return json(403,{ok:false,message:"origin_not_allowed"});
  if(event.httpMethod!=="GET")return json(405,{ok:false,message:"method_not_allowed"});
  const config=communityConfigStatus();
  if(!config.configured){
    return json(503,{ok:false,message:"server_not_configured",missing:config.missing,invalid:config.invalid,invalid_url_sources:config.invalidUrlSources,url_source:config.urlSource,url_host:config.urlHost,key_source:config.keySource,salt_source:config.saltSource});
  }
  try{
    await supabase("community_posts?select=id&limit=1");
    return json(200,{ok:true,database:true,url_source:config.urlSource,url_host:config.urlHost,key_source:config.keySource,salt_source:config.saltSource});
  }catch(err){
    if(err.code==="relation_missing")return json(503,{ok:false,message:"community_schema_missing"});
    if(err.code==="permission_denied")return json(503,{ok:false,message:"community_permission_missing"});
    return json(503,{ok:false,message:"community_database_unavailable"});
  }
};
