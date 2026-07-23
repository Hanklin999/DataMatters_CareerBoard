import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const overlay = process.env.OVERLAY_BUILD === "true";
const required = [
  "index.html", "styles.css", "product-v3.css", "app.js", "product-v3.js",
  "analytics-events.js", "analytics.js", "analytics-config.js", "community.js"
];
const integrationAssets = ["data/careers.json", "data/skills.json", "images"];
const missing = [...required, ...integrationAssets].filter(file => !existsSync(join(root, file)));

if (missing.length && !overlay) {
  console.error(`Production build stopped. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const file of required) {
  if (existsSync(join(root, file))) cpSync(join(root, file), join(dist, basename(file)), { recursive: true });
}
for (const dir of ["data", "images", "docs"]) {
  if (existsSync(join(root, dir))) cpSync(join(root, dir), join(dist, dir), { recursive: true });
}

// Keep the repository's existing analytics-config.js by default. This preserves the
// current Supabase project settings. When both public env vars are provided, generate
// the dist-only config from those values without changing the source file.
const publicUrl = process.env.VITE_SUPABASE_URL;
const publicAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (publicUrl && publicAnonKey && existsSync(join(dist, "analytics-config.js"))) {
  const enabled = process.env.VITE_ANALYTICS_ENABLED !== "false";
  const env = process.env.VITE_ANALYTICS_ENV || "production";
  const debug = process.env.VITE_ANALYTICS_DEBUG === "true";
  const generated = `/* Generated for deployment. Never put a service-role key here. */\nwindow.ANALYTICS_CONFIG = {\n  SUPABASE_URL: ${JSON.stringify(publicUrl)},\n  SUPABASE_ANON_KEY: ${JSON.stringify(publicAnonKey)},\n  ANALYTICS_ENABLED: ${enabled},\n  ANALYTICS_ENV: ${JSON.stringify(env)},\n  ANALYTICS_DEBUG: ${debug},\n  APP_VERSION: "v3.13.3",\n  SCORING_VERSION: "v2"\n};\n`;
  writeFileSync(join(dist, "analytics-config.js"), generated);
} else if (!overlay && existsSync(join(dist, "analytics-config.js"))) {
  const existing = readFileSync(join(dist, "analytics-config.js"), "utf8");
  if (!/SUPABASE_URL\s*:\s*["'][^"']+["']/.test(existing) || !/SUPABASE_ANON_KEY\s*:\s*["'][^"']+["']/.test(existing)) {
    console.warn("Analytics config has no public project values; analytics will be disabled unless Netlify env vars are supplied.");
  }
}

console.log(`Built ${dist}${overlay ? " (overlay validation mode)" : ""}`);
