# Product DS Results

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
