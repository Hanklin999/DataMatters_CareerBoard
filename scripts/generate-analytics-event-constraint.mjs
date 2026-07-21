import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const registryPath = resolve(root, "analytics-events.js");
const generatedPath = resolve(root, "supabase/generated/analytics_event_constraint.sql");
const migrationPath = resolve(root, "supabase/migrations/006_sync_analytics_event_names.sql");
const preflightPath = resolve(root, "supabase/generated/check_legacy_analytics_events.sql");
const checkOnly = process.argv.includes("--check");

function loadRegistry() {
  const source = readFileSync(registryPath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: registryPath });
  const registry = sandbox.window.DMAnalyticsEvents;
  if (!registry || !registry.EVENTS || !Array.isArray(registry.EVENT_NAMES)) {
    throw new Error("analytics-events.js did not expose window.DMAnalyticsEvents correctly.");
  }
  const names = [...registry.EVENT_NAMES];
  if (!names.length) throw new Error("Analytics event registry is empty.");
  if (new Set(names).size !== names.length) throw new Error("Analytics event registry contains duplicates.");
  for (const name of names) {
    if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error(`Invalid analytics event name: ${name}`);
  }
  return names.sort();
}

function sqlList(names, indent = "    ") {
  return names.map((name, index) => `${indent}'${name}'${index === names.length - 1 ? "" : ","}`).join("\n");
}

function renderBody(names) {
  const list4 = sqlList(names, "    ");
  const list6 = sqlList(names, "      ");
  return `-- GENERATED FILE. DO NOT EDIT BY HAND.\n-- Source of truth: analytics-events.js\n-- Regenerate with: npm run generate:analytics-schema\n-- This script preserves existing analytics rows. If legacy event names exist, it aborts\n-- before changing the constraint or RLS policy and reports the names for manual review.\n\n-- Preflight: run this query by itself before applying the migration.\nselect distinct event_name\nfrom public.analytics_events\nwhere event_name not in (\n${list4}\n)\norder by event_name;\n\nbegin;\n\ndo $$\ndeclare\n  legacy_events text;\nbegin\n  select string_agg(event_name, ', ' order by event_name)\n  into legacy_events\n  from (\n    select distinct event_name\n    from public.analytics_events\n    where event_name not in (\n${list6}\n    )\n  ) legacy;\n\n  if legacy_events is not null then\n    raise exception using\n      message = 'Analytics event constraint was not changed because legacy event names exist.',\n      detail = legacy_events,\n      hint = 'Map or retain these events explicitly. Do not delete production analytics data.';\n  end if;\nend\n$$;\n\nalter table public.analytics_events\n  drop constraint if exists analytics_events_event_name_check;\n\nalter table public.analytics_events\n  drop constraint if exists chk_event_allowlist;\n\nalter table public.analytics_events\n  add constraint analytics_events_event_name_check\n  check (\n    event_name in (\n${list6}\n    )\n  );\n\n-- The insert policy also uses the generated registry so a newly registered event is not\n-- accepted by the browser client but silently rejected by RLS.\ndrop policy if exists analytics_events_insert_only on public.analytics_events;\n\ncreate policy analytics_events_insert_only\non public.analytics_events\nfor insert\nto anon, authenticated\nwith check (\n  session_id is not null\n  and length(trim(event_name)) > 0\n  and event_name in (\n${list4}\n  )\n  and occurred_at = now()\n);\n\ncommit;\n`;
}


function renderPreflight(names) {
  return `-- GENERATED FILE. DO NOT EDIT BY HAND.\n-- Source of truth: analytics-events.js\n-- Run this before applying 006_sync_analytics_event_names.sql.\n\nselect distinct event_name\nfrom public.analytics_events\nwhere event_name not in (\n${sqlList(names, "    ")}\n)\norder by event_name;\n`;
}

function renderMigration(names) {
  return `-- Migration 006: synchronize analytics event constraint and insert policy.\n-- Generated from analytics-events.js; rerun npm run generate:analytics-schema after registry changes.\n-- Repository audit found no production-code event outside the registry. Production legacy\n-- rows are unknown until the preflight query runs; this migration never deletes them.\n\n${renderBody(names)}`;
}

function renderGenerated(names) {
  return renderBody(names);
}

function checkFile(path, expected) {
  if (!existsSync(path)) {
    console.error(`Missing generated file: ${path}`);
    return false;
  }
  const actual = readFileSync(path, "utf8");
  if (actual !== expected) {
    console.error(`Generated analytics schema is stale: ${path}`);
    console.error("Run npm run generate:analytics-schema and commit the result.");
    return false;
  }
  return true;
}

const names = loadRegistry();
const generated = renderGenerated(names);
const migration = renderMigration(names);
const preflight = renderPreflight(names);

if (checkOnly) {
  const ok = checkFile(generatedPath, generated) && checkFile(migrationPath, migration) && checkFile(preflightPath, preflight);
  if (!ok) process.exit(1);
  console.log(`Analytics schema is current (${names.length} events).`);
} else {
  for (const path of [generatedPath, migrationPath, preflightPath]) mkdirSync(dirname(path), { recursive: true });
  writeFileSync(generatedPath, generated, "utf8");
  writeFileSync(migrationPath, migration, "utf8");
  writeFileSync(preflightPath, preflight, "utf8");
  console.log(`Generated analytics SQL for ${names.length} events.`);
  console.log(`- ${generatedPath}`);
  console.log(`- ${migrationPath}`);
  console.log(`- ${preflightPath}`);
}
