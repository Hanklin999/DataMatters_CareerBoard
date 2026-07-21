import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);

function setOrDelete(name,value){if(value===undefined)delete process.env[name];else process.env[name]=value;}

test("a malformed SUPABASE_URL no longer shadows a valid VITE_SUPABASE_URL",()=>{
  const names=["SUPABASE_URL","VITE_SUPABASE_URL","SUPABASE_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","COMMUNITY_HASH_SALT"];
  const old=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  try{
    process.env.SUPABASE_URL="https://supabase.com/dashboard/project/example";
    process.env.VITE_SUPABASE_URL="https://rmflseoygadbocpkgxyi.supabase.co";
    process.env.SUPABASE_SECRET_KEY="sb_secret_"+"x".repeat(40);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.COMMUNITY_HASH_SALT="s".repeat(48);
    delete require.cache[require.resolve("../netlify/functions/_community-utils.js")];
    const utils=require("../netlify/functions/_community-utils.js");
    const status=utils.communityConfigStatus();
    assert.equal(status.configured,true);
    assert.equal(status.urlSource,"VITE_SUPABASE_URL");
    assert.equal(status.urlHost,"rmflseoygadbocpkgxyi.supabase.co");
    assert.deepEqual(status.invalidUrlSources,["SUPABASE_URL"]);
    assert.equal(utils.supabaseBaseUrl(),"https://rmflseoygadbocpkgxyi.supabase.co");
  }finally{
    for(const [name,value] of Object.entries(old))setOrDelete(name,value);
    delete require.cache[require.resolve("../netlify/functions/_community-utils.js")];
  }
});
