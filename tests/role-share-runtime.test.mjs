import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
const require=createRequire(import.meta.url);

test("copied result links use a role-specific share route and Open Graph image",async()=>{
  const product=readFileSync("product-v3.js","utf8");
  assert.match(product,/new URL\(`\/share\/\$\{encodeURIComponent\(shareRoleId\)\}`/);
  const {handler}=require("../netlify/functions/role-share.js");
  const res=await handler({httpMethod:"GET",headers:{host:"datamatters-hanks-career-board.netlify.app"},queryStringParameters:{role:"data-science-applied-modeling"}});
  assert.equal(res.statusCode,200);
  assert.match(res.body,/property="og:image" content="https:\/\/datamatters-hanks-career-board\.netlify\.app\/images\/probability-alchemist\.jpg"/);
  assert.match(res.body,/機率鍊金術師/);
  assert.match(res.body,/utm_campaign=result_share/);
});
