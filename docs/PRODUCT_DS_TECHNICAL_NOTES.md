# Product Data Science Technical Notes

This document describes the analytical depth behind Data Matters and the technical work required to turn the current product into a stronger Product Data Science portfolio case.

It separates what is **already implemented** from what is **proposed next**. No causal or business-impact claim should be made before the corresponding analysis is completed.

---

## 1. Product decision framework

The product is not trying to maximize quiz completion in isolation.

The decision problem is:

> Which product changes help users form a clearer and more actionable mental model of data careers?

This creates four analytical objects:

1. **User progression** — whether users move through the experience.
2. **Recommendation quality** — whether the output is stable, understandable, and perceived as relevant.
3. **Actionability** — whether the result leads to deeper exploration.
4. **Learning impact** — whether users report greater clarity after the experience.

---

## 2. Metric tree

### Product objective

Increase the number of users who complete a meaningful career exploration.

### North-star candidate

`meaningful_exploration_rate`

```text
completed assessment
AND at least one of:
- primary role opened
- alternate role opened
- role comparison completed
- job opened
- external job clicked
- result shared
```

### Input metrics

```text
Acquisition
├── landing_sessions
├── source_mix
└── shared_referral_sessions

Activation
├── quiz_start_rate
├── baseline_clarity_submission_rate
└── first_step_completion_rate

Core experience
├── quiz_completion_rate
├── median_completion_time
├── step_abandonment_rate
├── question_response_time
└── answer_change_rate

Recommendation
├── result_view_rate
├── primary_role_open_rate
├── alternate_role_open_rate
├── comparison_completion_rate
├── perceived_accuracy
└── low_confidence_result_rate

Action
├── job_open_rate
├── external_job_ctr
├── share_rate
└── restart_rate

Learning
├── clarity_before
├── clarity_after
└── clarity_uplift
```

### Guardrails

- event delivery success;
- duplicate event rate;
- impossible sequence rate;
- mobile completion gap;
- p95 completion time;
- extremely fast completion;
- negative clarity uplift;
- low recommendation-fit concentration;
- repeated results caused by implementation bugs.

---

## 3. Event model

### Current design principles

The analytics client uses:

- an anonymous session identifier;
- a controlled event allowlist;
- controlled event properties;
- client-generated event identifiers;
- environment labeling;
- UTM capture;
- referrer-domain capture;
- device classification;
- non-blocking event delivery;
- limited retry behavior.

### Recommended canonical event contract

The product should converge on one versioned taxonomy.

```text
landing_viewed
quiz_started
clarity_before_submitted
quiz_step_viewed
quiz_question_answered
quiz_step_completed
quiz_completed
result_viewed
primary_role_opened
alternate_role_opened
role_compare_started
role_compare_completed
job_opened
external_job_clicked
result_shared
quiz_restarted
clarity_after_submitted
accuracy_rating_submitted
result_feedback_submitted
```

Every event should have:

```text
event_id
occurred_at
session_id
event_name
event_version
app_version
scoring_version
environment
page_path
device_type
referrer_domain
utm_source
utm_medium
utm_campaign
properties
```

### Required analytical properties

For assessment events:

```text
question_id
quiz_step
selected_option
response_time_ms
changed_answer
previous_option
question_mapping_version
```

For result events:

```text
top_role_id
second_role_id
third_role_id
recommendation_rank
match_level
result_clarity
score_margin_1_2
```

For role and job exploration:

```text
role_id
source_section
list_position
domain_id
job_id
company_name
destination_domain
```

### Important implementation risk

The event names emitted by the product layer and the event names accepted by the analytics allowlist must be automatically checked against one another.

Recommended CI test:

1. parse all event names passed to the tracking function;
2. compare them with the analytics allowlist;
3. compare the allowlist with the database constraint;
4. fail the build if any mismatch exists.

This is a high-value technical improvement because a visually correct product can still produce incomplete analytics silently.

---

## 4. Analytics data model

Use a layered model instead of querying raw events directly.

### Layer 1 — raw events

`analytics_events`

Immutable, append-only event rows.

### Layer 2 — cleaned events

`stg_analytics_events`

Responsibilities:

- normalize event names;
- extract typed properties;
- remove production-test traffic;
- deduplicate by `client_event_id`;
- mark malformed rows;
- standardize role and question identifiers.

### Layer 3 — sessions

`fct_sessions`

One row per session.

Suggested fields:

```text
session_id
session_started_at
session_ended_at
session_duration_sec
device_type
acquisition_source
landing_variant
quiz_started
quiz_completed
result_viewed
top_role_id
result_confidence
meaningful_exploration
clarity_before
clarity_after
clarity_uplift
accuracy_rating
job_opened
external_job_clicked
result_shared
```

### Layer 4 — question responses

`fct_question_responses`

One row per final question answer, plus behavioral diagnostics.

```text
session_id
question_id
quiz_step
first_answer
final_answer
answer_change_count
first_response_time_ms
total_question_time_ms
mapping_version
```

### Layer 5 — recommendation outcomes

`fct_recommendation_outcomes`

```text
session_id
top_role_id
second_role_id
third_role_id
score_1
score_2
score_3
score_margin_1_2
match_level
primary_opened
alternate_opened
preferred_role_id
preferred_role_was_top_1
preferred_role_was_top_3
accuracy_rating
clarity_uplift
```

---

## 5. Example SQL analyses

The exact SQL must be aligned with the final database schema.

### Funnel

```sql
with session_flags as (
    select
        session_id,
        max((event_name = 'landing_viewed')::int) as landed,
        max((event_name = 'quiz_started')::int) as started,
        max((event_name = 'quiz_completed')::int) as completed,
        max((event_name = 'result_viewed')::int) as viewed_result,
        max((
            event_name in (
                'primary_role_opened',
                'alternate_role_opened',
                'role_compare_completed',
                'job_opened',
                'external_job_clicked',
                'result_shared'
            )
        )::int) as meaningful_action
    from stg_analytics_events
    where environment = 'production'
    group by 1
)
select
    count(*) as sessions,
    avg(started) as quiz_start_rate,
    avg(completed) as quiz_completion_rate,
    avg(viewed_result) as result_view_rate,
    avg(meaningful_action) as meaningful_action_rate
from session_flags;
```

### Step abandonment

```sql
select
    quiz_step,
    count(distinct session_id) as sessions_viewed,
    count(distinct session_id)
        filter (where event_name = 'quiz_step_completed') as sessions_completed,
    1.0
      - count(distinct session_id)
          filter (where event_name = 'quiz_step_completed')
        / nullif(count(distinct session_id), 0)::numeric
      as abandonment_rate
from stg_analytics_events
where event_name in ('quiz_step_viewed', 'quiz_step_completed')
group by 1
order by 1;
```

### Clarity uplift

```sql
select
    top_role_id,
    count(*) as responses,
    avg(clarity_before) as avg_before,
    avg(clarity_after) as avg_after,
    avg(clarity_after - clarity_before) as avg_uplift,
    avg(accuracy_rating) as avg_accuracy
from fct_recommendation_outcomes
where clarity_before is not null
  and clarity_after is not null
group by 1
order by responses desc;
```

### Question friction

```sql
select
    question_id,
    count(*) as answers,
    percentile_cont(0.5) within group (order by response_time_ms)
        as median_response_time_ms,
    avg(changed_answer::int) as answer_change_rate
from stg_question_answer_events
group by 1
having count(*) >= 20
order by median_response_time_ms desc;
```

### Exploration by confidence

```sql
select
    match_level,
    count(*) as sessions,
    avg(primary_opened::int) as primary_open_rate,
    avg(alternate_opened::int) as alternate_open_rate,
    avg(accuracy_rating) as avg_accuracy,
    avg(clarity_uplift) as avg_clarity_uplift
from fct_recommendation_outcomes
group by 1;
```

---

## 6. Recommendation-system validation

The current approach is interpretable and rule-based. That makes validation possible even without historical labels.

### 6.1 Reachability

Every role family should be reachable under at least one valid response profile.

Test:

- generate broad combinations of answers;
- run the scoring function;
- verify that all role families can rank first;
- inspect roles that are extremely rare or dominant.

A role that is never recommended may indicate a scoring or taxonomy defect.

### 6.2 Synthetic personas

Create expected profiles such as:

- dashboard-oriented business analyst;
- experimentation-focused product data scientist;
- pipeline-oriented data engineer;
- optimization-focused operations researcher;
- model-deployment-oriented ML engineer.

For each persona, define:

- expected top role;
- acceptable top-three roles;
- unacceptable outcomes;
- explanation expectations.

These are regression tests, not ground truth.

### 6.3 Local sensitivity

For each completed response vector:

1. change one answer by one level;
2. recompute rankings;
3. observe rank changes;
4. flag large, unintuitive reversals.

Metrics:

```text
top_1_flip_rate
top_3_jaccard_similarity
mean_rank_displacement
explanation_change_rate
```

### 6.4 Score-margin calibration

Compare the score gap between the first and second role with:

- perceived accuracy;
- alternate-role exploration;
- preferred-role selection;
- result restart behavior.

A small score margin should generally correspond to a less definitive explanation.

### 6.5 Counterfactual explanation

For each result, compute the smallest answer change that would alter the top role.

Example:

> “A stronger preference for building production systems would move Data Engineering above Data Analytics.”

This creates a more useful explanation than simply displaying weighted reasons.

### 6.6 Practitioner review

Recruit practitioners from each role family to review:

- question wording;
- role-weight mapping;
- daily-task descriptions;
- adjacent-role relationships;
- misleading or missing distinctions.

Use structured review rather than open-ended comments.

---

## 7. Product analysis plan

### Analysis 1 — Instrumentation audit

Goal: establish that event data is trustworthy.

Checks:

- accepted versus emitted event names;
- null rates;
- duplicate client event IDs;
- event latency;
- environment contamination;
- impossible sequences;
- sessions without landing events;
- completions without starts;
- result interactions without result views.

Deliverable:

`docs/analytics_data_quality.md` plus a reproducible query.

### Analysis 2 — Baseline funnel

Goal: identify the largest user-loss point.

Segments:

- mobile versus desktop;
- new versus shared-result referral;
- acquisition source;
- landing variant;
- baseline clarity.

Deliverable:

a funnel chart and one prioritized product problem.

### Analysis 3 — Question friction

Goal: identify confusing or low-information questions.

Signals:

- long response time;
- high answer-change rate;
- local abandonment;
- weak variation;
- strong correlation with another question;
- low contribution to ranking.

Deliverable:

a question revision or removal recommendation.

### Analysis 4 — Recommendation quality

Goal: determine where recommendations feel weak.

Segments:

- top role;
- score margin;
- match level;
- baseline clarity;
- device;
- first-time versus restart.

Deliverable:

calibration curve and a list of problematic role pairs.

### Analysis 5 — Result-page actionability

Goal: determine whether the result leads users to action.

Outcomes:

- primary role open;
- alternate role open;
- role comparison;
- job open;
- external click;
- result share.

Deliverable:

result-page behavior map and one experiment proposal.

---

## 8. Experimentation strategy

The product may initially have low traffic. Avoid broad, multi-cell experiments.

### Recommended first experiment

**Question**

Does a more concrete result-page CTA increase meaningful exploration without reducing perceived clarity?

**Control**

Generic CTA such as “Explore more.”

**Treatment**

Role-specific CTA such as:

> “See 6 Product Analyst and Product Data Scientist job examples.”

**Primary metric**

`meaningful_exploration_rate`

**Secondary metrics**

- primary-role open rate;
- job-open rate;
- external-job click rate.

**Guardrails**

- post-result clarity;
- recommendation accuracy rating;
- result-page exits;
- mobile layout errors.

**Unit of randomization**

Anonymous session.

**Exposure event**

Track only when the assigned CTA is rendered.

**Analysis**

- intention-to-treat;
- difference in proportions;
- confidence interval;
- pre-specified minimum sample size;
- no repeated peeking without a sequential-testing design.

### Low-traffic alternative

Use a mixed-method sequence:

1. five moderated sessions per variant;
2. event-based usability comparison;
3. launch the better candidate;
4. continue collecting observational evidence.

This is more defensible than claiming significance from a tiny sample.

---

## 9. Statistical cautions

### Clarity uplift is not automatically causal

`clarity_after - clarity_before` is useful, but it can be affected by:

- regression to the mean;
- demand effects;
- completion selection;
- scale interpretation;
- repeated exposure.

Treat it as a product-quality indicator unless a randomized design isolates the effect of a product change.

### Recommendation accuracy is self-reported

A user may rate a familiar role highly even when the system did not improve understanding.

Pair accuracy with:

- role-open behavior;
- alternate-role exploration;
- preferred-role selection;
- qualitative explanation.

### External clicks are not career outcomes

They indicate intent, not application, interview, or job acceptance.

Do not describe the project as improving employment outcomes without longitudinal evidence.

---

## 10. Dashboard specification

A lightweight Product DS dashboard should contain four pages.

### Executive overview

- sessions;
- quiz starts;
- completions;
- meaningful explorations;
- median clarity uplift;
- average accuracy rating.

### Funnel and segments

- full funnel;
- mobile/desktop split;
- source split;
- baseline-clarity split;
- shared-referral split.

### Recommendation quality

- recommendation volume by role;
- accuracy by role;
- score margin versus accuracy;
- top role versus preferred role;
- problematic role pairs.

### Question diagnostics

- response time;
- answer-change rate;
- abandonment;
- answer distributions;
- correlation or redundancy;
- scoring influence.

---

## 11. Reproducibility requirements

To make the project credible in interviews:

- version every scoring change;
- version every question-to-role mapping;
- keep event schema changes backward compatible;
- add seed data for local analytics tests;
- separate production, preview, and local traffic;
- document excluded sessions;
- store analysis SQL or notebooks in the repository;
- include a data dictionary;
- avoid screenshots without reproducible queries.

Recommended structure:

```text
analysis/
├── README.md
├── sql/
│   ├── 01_data_quality.sql
│   ├── 02_funnel.sql
│   ├── 03_question_friction.sql
│   └── 04_recommendation_quality.sql
├── notebooks/
│   └── recommendation_validation.ipynb
└── outputs/
    └── aggregate_figures/
```

Do not commit row-level production event data.

---

## 12. Interview-ready technical narrative

A concise technical explanation:

> I built a mobile-first career exploration product and treated the recommendation as a product decision system rather than a quiz. Because I did not have labeled career outcomes, I used an interpretable, versioned rule-based model and designed validation around synthetic personas, sensitivity tests, score margins, practitioner review, and user-perceived fit. I also instrumented the full funnel with anonymous first-party events so I could evaluate activation, question friction, recommendation quality, clarity uplift, and downstream role or job exploration. My next analytical step is to build a session-level mart and run a focused result-page experiment.

This narrative is strong only when supported by reproducible code, a data dictionary, and actual aggregate analysis.
