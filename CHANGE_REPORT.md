# Modification summary

## Single source of truth

- `analytics-events.js` — authoritative registry with 55 event names.
- `analytics.js` — consumes `DMAnalyticsEvents.EVENT_NAMES`; contains no fallback event list.
- `app.js`, `product-v3.js`, `community.js` — use registry constants and safely skip missing names.
- `index.html` — loads the registry before analytics and product scripts; cache version is `3.10.0`.

## Automated contract

- `tests/analytics-event-contract.test.mjs` — validates duplicates, naming format, literal calls, constant references, unused events, duplicate allowlists, and generated SQL parity.
- `test-analytics.mjs` — preserves the `window.DMAnalytics` API contract and now loads the registry explicitly.
- Runtime/product tests were updated to consume the registry instead of relying on duplicated event strings.

## Supabase synchronization

- `scripts/generate-analytics-event-constraint.mjs` — deterministic registry-to-SQL generator with `--check` mode.
- `supabase/generated/analytics_event_constraint.sql` — generated constraint and RLS policy SQL.
- `supabase/generated/check_legacy_analytics_events.sql` — standalone production preflight.
- `supabase/migrations/006_sync_analytics_event_names.sql` — data-preserving migration generated from the registry.

## Build and CI

- `package.json` — adds generation, check, and contract-test scripts; `validate` runs generation and the contract.
- `.github/workflows/validate.yml` — checks committed generated SQL before full validation.
- `scripts/build.mjs` — copies `analytics-events.js` into production output.
- `scripts/static-lint.mjs` — validates registry script syntax and script load order.

## Documentation

- `docs/ANALYTICS_DATA_DICTIONARY.md` — event dictionary grouped by acquisition, quiz, diagnostics, recommendations, role/job exploration, feedback, sharing, and community.

No CSS, UI structure, recommendation scoring, taxonomy, data files, or third-party analytics were changed.
