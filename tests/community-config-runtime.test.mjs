import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);

test("community server config accepts VITE_SUPABASE_URL and SUPABASE_SECRET_KEY",()=>{
  const old={...process.env};
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.VITE_SUPABASE_URL="https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY="s".repeat(40);
  delete require.cache[require.resolve("../netlify/functions/_community-utils.js")];
  const {communityConfigStatus,supabaseBaseUrl}=require("../netlify/functions/_community-utils.js");
  const status=communityConfigStatus();
  assert.equal(status.configured,true);
  assert.equal(status.urlSource,"VITE_SUPABASE_URL");
  assert.equal(status.keySource,"SUPABASE_SECRET_KEY");
  assert.equal(supabaseBaseUrl(),"https://example.supabase.co");
  process.env=old;
});
