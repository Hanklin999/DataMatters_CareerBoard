# Data Matters — Product Data Science Analysis

**Analysis implementation date:** 2026-07-22  
**Product:** [Data Matters](https://datamatters-hanks-career-board.netlify.app/)  
**Repository:** [Hanklin999/DataMatters_CareerBoard](https://github.com/Hanklin999/DataMatters_CareerBoard)

This directory turns the existing event instrumentation into a reproducible Product Data Science workflow.

It is designed to answer one product question:

> Does Data Matters help users move from career-role confusion to meaningful exploration of relevant data roles and jobs?

## Current evidence status

The analytics implementation is live, but row-level production data is not stored in the public repository. The public front-end configuration also does not contain a usable Supabase anon key for external analysis.

Therefore, as of **2026-07-22**, the following production values are **not confirmed**:

- number of production sessions;
- quiz start and completion rates;
- question-level response-time distributions;
- recommendation accuracy;
- clarity uplift;
- role or job exploration rates;
- mobile-versus-desktop differences.

This directory deliberately does not invent those numbers.

## What is implemented here

```text
analysis/
├── README.md
├── RESULTS.md
├── METRIC_DEFINITIONS.md
├── sql/
│   ├── 00_build_analytics_mart.sql
│   ├── 01_data_quality.sql
│   ├── 02_funnel.sql
│   ├── 03_question_friction.sql
│   ├── 04_recommendation_quality.sql
│   ├── 05_product_decision.sql
│   └── 99_export_for_notebook.sql
├── notebooks/
│   └── product_ds_analysis.ipynb
├── data/
│   ├── README.md
│   └── .gitignore
└── outputs/
    └── README.md
```

## Product objective

Increase the proportion of users who complete a **meaningful career exploration**.

A session qualifies only when it:

1. completes the assessment; and
2. performs at least one high-intent action after the assessment.

High-intent actions currently include:

- opening a role;
- opening an alternate role;
- completing a role comparison;
- opening a job;
- clicking an external job source;
- completing or saving a result share.

This is more useful than raw page views or quiz completion because it tests whether the result leads to a concrete next step.

## Analytical questions

### 1. Is the event data trustworthy?

Before using any metric, verify:

- duplicate client event IDs;
- missing session IDs;
- non-production traffic;
- impossible event sequences;
- malformed question properties;
- extreme session durations;
- missing role IDs on result events.

### 2. Where does the product lose users?

Measure:

```text
landing
→ quiz start
→ first quiz step completed
→ quiz completed
→ result viewed
→ meaningful exploration
```

Segment by:

- device type;
- acquisition source;
- baseline career clarity;
- app version;
- shared-result referral.

### 3. Which questions create friction?

Use:

- median and p90 response time;
- answer-change rate;
- local step abandonment;
- answer concentration;
- missing or invalid question properties.

Long response time alone does not prove that a question is bad. It should be combined with answer changes, abandonment and qualitative user feedback.

### 4. Where does recommendation quality break down?

Analyze:

- perceived accuracy by top role;
- clarity uplift by top role;
- top recommendation versus preferred role;
- top-three preference match;
- alternate-role exploration;
- recommendation quality by `match_level`;
- role pairs that frequently produce low ratings.

### 5. What product decision should follow?

Use `05_product_decision.sql` to rank opportunities by:

- affected-session volume;
- size of the metric gap;
- proximity to the product objective;
- implementation effort;
- evidence quality.

Do not choose a change only because a chart looks interesting.

## How to run

### Option A — Supabase SQL Editor

Run in this order:

```text
00_build_analytics_mart.sql
01_data_quality.sql
02_funnel.sql
03_question_friction.sql
04_recommendation_quality.sql
05_product_decision.sql
```

`00_build_analytics_mart.sql` creates read-only views under the `analytics_analysis` schema. It does not modify or delete production events.

### Option B — Local notebook

1. Run `99_export_for_notebook.sql` in the Supabase SQL Editor.
2. Export the result as CSV.
3. Save it locally as:

```text
analysis/data/analytics_events.csv
```

4. Open:

```text
analysis/notebooks/product_ds_analysis.ipynb
```

5. Run all cells.

The CSV is ignored by Git and must not be committed.

## Decision rules

Do not publish a product recommendation until:

- the data-quality checks have been reviewed;
- production and non-production traffic are separated;
- metric denominators are explicit;
- segments contain enough sessions to interpret;
- instrumentation deployment dates are considered;
- missing events are not mistaken for user inactivity.

For small samples, report counts and intervals rather than declaring percentage differences meaningful.

## Suggested first product test

The first experiment should target result-page actionability rather than recommendation-model complexity.

**Control**

> Explore related jobs

**Treatment**

> See 6 jobs related to your recommended role

**Primary metric**

`meaningful_exploration_rate`

**Secondary metrics**

- role-detail open rate;
- job-open rate;
- external-job click rate.

**Guardrails**

- clarity uplift;
- perceived recommendation accuracy;
- result-page exit;
- mobile rendering errors.

## Portfolio standard

The analysis becomes interview-ready when `RESULTS.md` contains:

1. a confirmed analysis period;
2. data-quality exclusions;
3. funnel results;
4. one question-friction finding;
5. one recommendation-quality finding;
6. one prioritized product decision;
7. an experiment or validation plan;
8. limitations.

Until then, describe this as a **reproducible analytics implementation**, not a completed impact study.
