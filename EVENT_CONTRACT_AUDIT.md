# Event contract audit

- Registry event count: **55**
- Events referenced by current production JavaScript: **53**
- Production literal analytics calls outside the registry: **0 after refactor**
- Duplicate registry values: **0**
- Invalid event-name formats: **0**
- Second manual JavaScript allowlists: **0**

## Unused registry events — warning only

- `community_filter_selected` — category filters were removed from the current community UI.
- `industry_selected` — registered for compatibility, but no current production handler emits it.

## Legacy events

Repository code did not reveal an event emitted outside the 55-name registry. The live Supabase dataset was not accessible in this environment, so production legacy rows are intentionally treated as unknown.

Run `supabase/generated/check_legacy_analytics_events.sql`. Migration 006 aborts without deleting data if legacy names are found.

## Original drift risks found

- The browser client owned a manually maintained `ALLOWED_EVENTS` array.
- Product files emitted string literals independently.
- SQL constraint/policy synchronization required manual copying.
- Existing tests validated pieces of the contract but did not prove registry/code/SQL parity.

The new generator and contract test close those four gaps.
