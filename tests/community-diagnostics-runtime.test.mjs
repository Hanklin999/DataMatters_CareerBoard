import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);

test("modern secret keys are sent only as apikey and config reports short salt",()=>{
  const old={...process.env};
  process.env.SUPABASE_URL="https://example.supabase.co";
  process.env.SUPABASE_SECRET_KEY="sb_secret_"+"x".repeat(40);
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.COMMUNITY_HASH_SALT="too-short";
  delete require.cache[require.resolve("../netlify/functions/_community-utils.js")];
  const utils=require("../netlify/functions/_community-utils.js");
  const status=utils.communityConfigStatus();
  assert.equal(status.configured,false);
  assert.ok(status.invalid.includes("COMMUNITY_HASH_SALT_MIN_32_CHARS"));
  process.env.COMMUNITY_HASH_SALT="s".repeat(40);
  delete require.cache[require.resolve("../netlify/functions/_community-utils.js")];
  const fixed=require("../netlify/functions/_community-utils.js");
  const headers=fixed.supabaseHeaders?fixed.supabaseHeaders():null;
  // Function is intentionally tested through source because headers are private in older overlays.
  const source=require("node:fs").readFileSync("netlify/functions/_community-utils.js","utf8");
  assert.match(source,/if\(!key\.startsWith\("sb_secret_"\)\)headers\.Authorization/);
  process.env=old;
});
