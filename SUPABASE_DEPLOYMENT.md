# Supabase analytics event sync

## 1. Run the preflight query

Open Supabase SQL Editor and execute:

`supabase/generated/check_legacy_analytics_events.sql`

Expected result: **0 rows**.

If rows appear, they are existing production event names not present in `analytics-events.js`. Do not delete them. Decide whether to:

- rename them to a current event;
- add an explicitly supported compatibility event to the registry; or
- preserve them outside the new constraint through a deliberate migration.

## 2. Apply the migration

When the preflight returns 0 rows, execute:

`supabase/migrations/006_sync_analytics_event_names.sql`

The migration:

- does not delete or update analytics rows;
- aborts before schema changes if legacy events exist;
- replaces the event-name check constraint;
- recreates the insert RLS policy from the generated event set;
- preserves the browser contract in which `occurred_at` uses the database default `now()`.

## 3. Deploy the site

Commit the registry, generated SQL, migration, and tests together. Deploy Netlify after the migration succeeds, so browser events and database validation switch to the same event contract.
