import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const overlay = process.env.OVERLAY_BUILD === "true";
const required = ["index.html","styles.css","product-v3.css","app.js","product-v3.js","analytics.js","analytics-config.js","community.js"];
const integrationAssets = ["data/careers.json","data/skills.json","images"];
const missing = [...required, ...integrationAssets].filter(file => !existsSync(join(root,file)));
if (missing.length && !overlay){
  console.error(`Production build stopped. Missing: ${missing.join(", ")}`);
  console.error("Apply this overlay to the complete repository before running npm run build.");
  process.exit(1);
}
rmSync(dist,{recursive:true,force:true}); mkdirSync(dist,{recursive:true});
for (const file of required){
  if (existsSync(join(root,file))) cpSync(join(root,file), join(dist,basename(file)), {recursive:true});
}
for (const dir of ["data","images","docs"]){ if(existsSync(join(root,dir))) cpSync(join(root,dir),join(dist,dir),{recursive:true}); }

const replacements = {
  "__VITE_SUPABASE_URL__": process.env.VITE_SUPABASE_URL || (overlay ? "" : null),
  "__VITE_SUPABASE_ANON_KEY__": process.env.VITE_SUPABASE_ANON_KEY || (overlay ? "" : null),
  "__VITE_ANALYTICS_ENABLED__": process.env.VITE_ANALYTICS_ENABLED || "true",
  "__VITE_ANALYTICS_ENV__": process.env.VITE_ANALYTICS_ENV || "production",
  "__VITE_ANALYTICS_DEBUG__": process.env.VITE_ANALYTICS_DEBUG || "false"
};
if (!overlay && Object.values(replacements).some(value => value === null)){
  console.error("Production build stopped. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.");
  process.exit(1);
}
const target = join(dist,"analytics-config.js");
let config = readFileSync(target,"utf8");
for (const [token,value] of Object.entries(replacements)) config = config.split(token).join(String(value ?? ""));
writeFileSync(target,config);
console.log(`Built ${dist}${overlay ? " (overlay validation mode)" : ""}`);
