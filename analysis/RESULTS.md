# Product DS Results
## Analysis period

2026-07-22 00:16–15:04, Asia/Taipei

## Data quality

The initial launch dataset contained 2,636 deduplicated production events across 170 anonymous sessions. All analyzed events included a production environment label, and no environment-missing rows were observed.

The dataset covered 157 landing sessions, 56 quiz-start sessions and 42 completed-result sessions. Recommendation accuracy and post-assessment clarity remained exploratory because only two sessions submitted each measure.

## Funnel finding

Only 35.7% of landing sessions started the assessment. Among sessions that started, 75.0% completed it. Most quiz-stage abandonment occurred before completion of the first step: 76.8% of starters completed Step 1, while 97.7% of those sessions subsequently completed the full assessment.

This indicates that the primary near-term opportunity is improving quiz entry and first-step usability rather than shortening later sections of the assessment.

## Engagement finding

Among 42 completed assessments, 22 sessions (52.4%) performed at least one defined post-result exploration action. Role exploration occurred in 18 sessions, while seven sessions interacted with job-related actions.

Job-event definitions require further auditing because job-card, job-open and external-click events currently have identical session and event counts.

## Question-friction finding

`problem_type` showed the highest observed answer-change rate, with 37 of 44 sessions changing an answer at least once. `math_pref` and `system_type` showed the longest median response times.

These findings require an instrumentation audit before being interpreted entirely as question confusion, because repeated option interactions may be recorded as answer changes.


**Last reviewed:** 2026-07-22

## Data status

Production metrics are currently **not confirmed** because row-level production events are not available in the public repository and cannot be read from the public front-end configuration.

Do not replace this statement with estimated numbers.

## Analysis period

```text
Start: Unable to confirm
End:   Unable to confirm
```

## Data-quality review

| Check | Result | Decision |
|---|---:|---|
| Production event rows | Unable to confirm | Run `01_data_quality.sql` |
| Production sessions | Unable to confirm | Run `01_data_quality.sql` |
| Duplicate client event IDs | Unable to confirm | Review before building metrics |
| Missing environment | Unable to confirm | Exclude or classify manually |
| Impossible sequences | Unable to confirm | Investigate before funnel analysis |
| Valid question response times | Unable to confirm | Report exclusion counts |

## Funnel results

| Step | Sessions | From landing | From previous step |
|---|---:|---:|---:|
| Landing viewed | Unable to confirm | — | — |
| Quiz started | Unable to confirm | Unable to confirm | Unable to confirm |
| First step completed | Unable to confirm | Unable to confirm | Unable to confirm |
| Quiz completed | Unable to confirm | Unable to confirm | Unable to confirm |
| Result viewed | Unable to confirm | Unable to confirm | Unable to confirm |
| Meaningful exploration | Unable to confirm | Unable to confirm | Unable to confirm |

## Question-friction finding

**Status:** Unable to confirm.

Complete after running `03_question_friction.sql`.

Required evidence:

- question ID;
- number of sessions;
- median and p90 response time;
- answer-change rate;
- step abandonment;
- answer distribution;
- qualitative explanation.

## Recommendation-quality finding

**Status:** Unable to confirm.

Complete after running `04_recommendation_quality.sql`.

Required evidence:

- top role or role pair;
- number of result sessions;
- rating-response coverage;
- average and distribution of accuracy rating;
- paired clarity coverage;
- meaningful exploration;
- limitation.

## Product decision

**Status:** Not selected.

Use this structure:

> We observed **[problem]** among **[segment]**, affecting **[N] sessions**. The relevant metric was **[metric and value]**, compared with **[benchmark or comparison]**. We will change **[specific product element]** because it is the closest controllable mechanism. We will evaluate the change using **[primary metric]**, with **[guardrails]**.

## Recommended first decision candidate

Until the actual data identifies a larger issue, the strongest testable candidate is:

> Replace a generic result-page CTA with a concrete, role-specific job-exploration CTA.

This is a hypothesis, not a confirmed recommendation.

## Limitations

- Anonymous sessions do not measure long-term career outcomes.
- Clarity uplift is self-reported and not causal by itself.
- Recommendation ratings are subject to response selection.
- Event coverage differs by deployment date.
- Small role-level samples can produce unstable averages.
- External clicks represent intent, not applications or offers.
