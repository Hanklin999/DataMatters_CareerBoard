import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handler } = require("../netlify/functions/community-read.js");

test("community-read falls back to visible base-table fields when views are missing", async () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.COMMUNITY_HASH_SALT = "12345678901234567890123456789012";

  const requests = [];
  global.fetch = async (url) => {
    requests.push(String(url));
    if (String(url).includes("public_visible_community_posts")) {
      return new Response(JSON.stringify({ code:"42P01", message:"relation does not exist" }), {
        status:404,
        headers:{ "Content-Type":"application/json" }
      });
    }
    if (String(url).includes("community_posts?")) {
      return new Response("[]", { status:200, headers:{ "Content-Type":"application/json" } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const response = await handler({ httpMethod:"GET", headers:{}, queryStringParameters:{ sort:"latest" } });
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(body.source, "base_tables");
    assert.deepEqual(body.posts, []);
    assert.ok(requests.some(url => url.includes("public_visible_community_posts")));
    assert.ok(requests.some(url => url.includes("community_posts?")));
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
});
