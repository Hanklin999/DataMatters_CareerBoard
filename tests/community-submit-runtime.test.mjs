import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);

test("community post submission uses a legacy-safe hidden category",async()=>{
  const oldFetch=global.fetch;
  const oldEnv={...process.env};
  const requests=[];
  process.env.SUPABASE_URL="https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY="x".repeat(40);
  process.env.COMMUNITY_HASH_SALT="s".repeat(40);
  process.env.COMMUNITY_ALLOWED_ORIGINS="https://datamatters-hanks-career-board.netlify.app";
  delete process.env.COMMUNITY_DEFAULT_CATEGORY;
  delete process.env.TURNSTILE_SECRET_KEY;
  global.fetch=async(url,options={})=>{
    requests.push({url,options});
    if((options.method||"GET")==="POST")return {ok:true,status:201,text:async()=>JSON.stringify([{id:"11111111-1111-4111-8111-111111111111"}])};
    return {ok:true,status:200,text:async()=>"[]"};
  };
  delete require.cache[require.resolve("../netlify/functions/community-submit.js")];
  const {handler}=require("../netlify/functions/community-submit.js");
  const response=await handler({
    httpMethod:"POST",
    headers:{origin:"https://datamatters-hanks-career-board.netlify.app","user-agent":"test","x-nf-client-connection-ip":"1.2.3.4"},
    body:JSON.stringify({type:"post",nickname:"匿名學生",content:"我想了解資料分析與產品分析的差別。",consent:true,form_started_at:Date.now()-5000,session_id:"11111111-1111-4111-8111-111111111111"})
  });
  assert.equal(response.statusCode,201,response.body);
  const insert=requests.find(r=>r.options.method==="POST");
  const row=JSON.parse(insert.options.body);
  assert.equal(row.category,"職涯方向");
  global.fetch=oldFetch;
  process.env=oldEnv;
});
