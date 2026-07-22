# Aggregate analysis outputs

This directory is for privacy-safe, reproducible outputs such as:

```text
funnel_overall.csv
funnel_by_device.csv
question_friction.csv
recommendation_quality_by_role.csv
funnel.png
question_response_time.png
```

Before committing an output:

- verify that it contains no session IDs;
- suppress very small cells;
- include the analysis period;
- record the source query or notebook;
- avoid claiming statistical significance without a pre-specified method.
