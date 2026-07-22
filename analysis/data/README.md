# Local analytics data

Save the Supabase export as:

```text
analytics_events.csv
```

This directory ignores CSV, Parquet and JSON data files by default.

Do not commit:

- row-level event data;
- session identifiers;
- Supabase keys;
- production exports.

Only privacy-safe aggregate tables and figures should be committed under `analysis/outputs/`.
