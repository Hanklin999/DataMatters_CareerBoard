import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import vm from "node:vm";

const root = process.cwd();
const registryFile = resolve(root, "analytics-events.js");
const registrySource = readFileSync(registryFile, "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(registrySource, sandbox, { filename: registryFile });

const registry = sandbox.window.DMAnalyticsEvents;
assert.ok(registry, "analytics-events.js must expose window.DMAnalyticsEvents");
assert.ok(registry.EVENTS && typeof registry.EVENTS === "object", "Registry EVENTS object is missing");
assert.ok(Array.isArray(registry.EVENT_NAMES), "Registry EVENT_NAMES array is missing");

const entries = Object.entries(registry.EVENTS);
const eventNames = [...registry.EVENT_NAMES];
const eventSet = new Set(eventNames);
const keyToName = new Map(entries);
const nameToKey = new Map(entries.map(([key, value]) => [value, key]));

assert.equal(eventSet.size, eventNames.length, "Registry contains duplicate event values");
assert.equal(entries.length, eventNames.length, "EVENTS and EVENT_NAMES must contain the same number of events");
for (const [key, name] of entries) {
  assert.match(key, /^[A-Z][A-Z0-9_]*$/, `Invalid registry key: ${key}`);
  assert.match(name, /^[a-z][a-z0-9_]*$/, `Invalid event value: ${name}`);
  assert.equal(nameToKey.get(name), key, `Duplicate or inconsistent registry value: ${name}`);
}

const skippedDirectories = new Set([".git", "node_modules", "dist", "tests"]);
const skippedFiles = new Set([
  "analytics-events.js",
  "test-analytics.mjs",
  "test-cases.mjs",
  "validate-data.mjs"
]);

function walk(directory) {
  const result = [];
  for (const name of readdirSync(directory)) {
    if (skippedDirectories.has(name)) continue;
    const path = resolve(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...walk(path));
    else if (/\.(?:js|mjs)$/.test(name) && !skippedFiles.has(name)) result.push(path);
  }
  return result;
}

const productionFiles = walk(root);
const literalFailures = [];
const constantFailures = [];
const usedEvents = new Set();

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function addLiteral(file, source, match, eventName) {
  if (eventSet.has(eventName)) {
    usedEvents.add(eventName);
    return;
  }
  literalFailures.push({
    eventName,
    file: relative(root, file),
    line: lineNumber(source, match.index)
  });
}

for (const file of productionFiles) {
  const source = readFileSync(file, "utf8");

  // Direct analytics calls where the event name is the first argument.
  const firstArgumentPatterns = [
    /\btrack\s*\(\s*(["'])([a-zA-Z0-9_-]+)\1/g,
    /\bsafeTrack\s*\(\s*(["'])([a-zA-Z0-9_-]+)\1/g,
    /\btrackCommunity\s*\(\s*(["'])([a-zA-Z0-9_-]+)\1/g,
    /(?:window\.)?DMAnalytics\.track\s*\(\s*(["'])([a-zA-Z0-9_-]+)\1/g
  ];
  for (const pattern of firstArgumentPatterns) {
    for (const match of source.matchAll(pattern)) addLiteral(file, source, match, match[2]);
  }

  // Existing API supports (event, payload) and (key, event, payload).
  for (const match of source.matchAll(/(?:window\.)?DMAnalytics\.trackOncePerSession\s*\(\s*(["'])([^"']+)\1(?:\s*,\s*(["'])([^"']+)\3)?/g)) {
    const eventName = match[4] || match[2];
    addLiteral(file, source, match, eventName);
  }
  for (const match of source.matchAll(/(?:window\.)?DMAnalytics\.trackOncePerRun\s*\([^,]+,\s*(["'])([^"']+)\1/g)) {
    addLiteral(file, source, match, match[2]);
  }

  // All product event references must resolve through the registry.
  for (const match of source.matchAll(/\b(?:APP_EVENTS|EVENTS)\.([A-Z][A-Z0-9_]*)\b/g)) {
    const key = match[1];
    const name = keyToName.get(key);
    if (!name) {
      constantFailures.push({ key, file: relative(root, file), line: lineNumber(source, match.index) });
    } else {
      usedEvents.add(name);
    }
  }
}

if (literalFailures.length) {
  const details = literalFailures.map(item => `- ${item.eventName} — ${item.file}:${item.line}`).join("\n");
  assert.fail(`Analytics literal calls reference events outside the registry:\n${details}`);
}
if (constantFailures.length) {
  const details = constantFailures.map(item => `- ${item.key} — ${item.file}:${item.line}`).join("\n");
  assert.fail(`Analytics constant references are missing from the registry:\n${details}`);
}

// Prevent another manually maintained browser allowlist.
for (const file of productionFiles) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(
    source,
    /\bALLOWED_EVENTS\s*=\s*\[/,
    `Manual ALLOWED_EVENTS array is forbidden outside analytics-events.js: ${relative(root, file)}`
  );

  // Also catch a renamed array containing a large copied set of event literals.
  for (const match of source.matchAll(/\[[\s\S]{0,12000}?\]/g)) {
    const values = [...match[0].matchAll(/["']([a-z][a-z0-9_]+)["']/g)].map(item => item[1]);
    const registryValues = values.filter(value => eventSet.has(value));
    if (new Set(registryValues).size >= 5) {
      assert.fail(`Possible copied analytics allowlist in ${relative(root, file)}:${lineNumber(source, match.index)}`);
    }
  }
}

// Generated SQL and the migration must be deterministic and match the registry.
const generatedSql = readFileSync(resolve(root, "supabase/generated/analytics_event_constraint.sql"), "utf8");
const migrationSql = readFileSync(resolve(root, "supabase/migrations/006_sync_analytics_event_names.sql"), "utf8");
const preflightSql = readFileSync(resolve(root, "supabase/generated/check_legacy_analytics_events.sql"), "utf8");
for (const name of eventNames) {
  assert.ok(generatedSql.includes(`'${name}'`), `Generated SQL is missing ${name}`);
  assert.ok(migrationSql.includes(`'${name}'`), `Migration is missing ${name}`);
  assert.ok(preflightSql.includes(`'${name}'`), `Preflight SQL is missing ${name}`);
}
const sqlNames = new Set([...generatedSql.matchAll(/'([a-z][a-z0-9_]*)'/g)].map(match => match[1]).filter(name => eventSet.has(name)));
assert.deepEqual([...sqlNames].sort(), [...eventSet].sort(), "Generated SQL event set differs from the registry");

const unused = eventNames.filter(name => !usedEvents.has(name)).sort();
console.log(`Analytics registry: ${eventNames.length} events`);
console.log(`Production code uses: ${usedEvents.size} events`);
if (unused.length) {
  console.warn(`Unused registry events (${unused.length}; warning only):`);
  for (const name of unused) console.warn(`- ${name}`);
} else {
  console.log("Unused registry events: none");
}
console.log("Analytics event contract checks passed.");
