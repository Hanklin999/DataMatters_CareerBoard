# Product DS Analysis and Execution Roadmap

This roadmap prioritizes work by interview value, analytical rigor, and implementation effort.

Do not start by adding more front-end features. The highest-value gap is turning existing instrumentation into a trustworthy analysis and a product decision.

---

## Priority 0 — Make the analytics trustworthy

### P0.1 Unify the event taxonomy

**Problem**

The product layer and analytics allowlist can drift apart, causing silent event loss.

**Action**

- define one canonical event registry;
- import or generate the front-end allowlist from it;
- use the same registry to generate the database constraint;
- add CI validation for emitted, allowed, and stored event names.

**Interview value**

Demonstrates analytics engineering, instrumentation governance, and awareness that product decisions are only as good as event quality.

### P0.2 Build a data dictionary

Create:

`docs/ANALYTICS_DATA_DICTIONARY.md`

For every event, document:

- business meaning;
- trigger;
- unit of analysis;
- required properties;
- optional properties;
- expected predecessor;
- expected maximum frequency;
- schema version.

### P0.3 Add data-quality SQL

At minimum:

- duplicate `client_event_id`;
- null `session_id`;
- unknown role or question IDs;
- preview/local events in production analysis;
- completion without start;
- result view without completion;
- negative or impossible response time;
- clarity values outside the expected scale.

### P0.4 Add a consent and privacy note

The current design is privacy-conscious. Make that visible in the product and repository.

Do not claim legal compliance unless formally reviewed.

---

## Priority 1 — Publish one real Product DS analysis

### P1.1 Session-level mart

Create a reproducible SQL model with one row per anonymous session.

### P1.2 Baseline funnel

Analyze:

```text
landing
→ quiz start
→ first step complete
→ quiz complete
→ result view
→ meaningful exploration
```

Segment by:

- device;
- acquisition source;
- shared-result referral;
- baseline clarity.

### P1.3 Question-friction analysis

Rank questions by:

- median response time;
- answer-change rate;
- local abandonment;
- answer concentration;
- correlation with other questions;
- influence on final ranking.

### P1.4 Recommendation-quality analysis

Analyze:

- perceived accuracy by top role;
- clarity uplift by top role;
- top-one versus preferred role;
- top-three recall of preferred role;
- score margin versus perceived accuracy;
- restart behavior by confidence state.

### P1.5 Publish the case study

Add:

`analysis/README.md`

Include:

1. business question;
2. metric definition;
3. data-quality checks;
4. method;
5. results;
6. product recommendation;
7. limitations;
8. next test.

This is the single most valuable addition for a Product DS interview.

---

## Priority 2 — Validate the scoring system

### P2.1 Synthetic persona test suite

Add 15–25 named personas.

Example:

```json
{
  "persona": "Experimentation-oriented product data scientist",
  "expected_top_roles": ["DS", "DABI"],
  "must_not_rank_first": ["GOV"],
  "notes": "High experimentation, moderate coding, high ambiguity tolerance"
}
```

### P2.2 Recommendation stability notebook

For each answer vector:

- perturb one answer by ±1;
- recompute top three;
- calculate top-one flip rate;
- calculate top-three Jaccard similarity;
- identify sensitive questions and role pairs.

### P2.3 Score-margin calibration

Create confidence bands from the top-one/top-two score gap.

Then compare bands against:

- accuracy rating;
- preferred-role top-three match;
- alternate-role exploration;
- restart rate.

### P2.4 Practitioner review

Collect structured ratings for:

- role-description accuracy;
- question relevance;
- weight direction;
- missing distinctions;
- adjacent-role correctness.

Do not simply ask “Does this look right?”

---

## Priority 3 — Run one focused experiment

### Recommended experiment

**Treatment**

Replace a generic result-page CTA with a role-specific, concrete action.

**Example**

Control:
> Explore related jobs

Treatment:
> See 6 Product Analyst and Product Data Scientist job examples

**Primary metric**
- meaningful exploration rate.

**Secondary**
- job-open rate;
- external-job click rate;
- role-detail open rate.

**Guardrails**
- clarity uplift;
- perceived accuracy;
- result-page exits;
- page performance.

### Why this experiment?

It is:

- directly tied to the product job;
- easy to explain;
- easy to randomize;
- measurable with existing events;
- less confounded than changing the recommendation algorithm.

---

## Priority 4 — Improve recommendation explanations

### P4.1 Counterfactual explanation

Show the smallest preference change that would alter the top result.

Example:

> You were close to Data Engineering. A stronger preference for building stable systems would move it above Data Analytics.

### P4.2 Role-pair explanation

For the top two roles, show the decisive dimensions.

Example:

```text
Product Data Science ranked above Product Analytics because:
+ stronger interest in experimentation
+ greater willingness to code
- slightly lower preference for recurring stakeholder reporting
```

### P4.3 Uncertainty language

Do not display a confident identity label when the score margin is small.

Use:

- “Most aligned”
- “Two close directions”
- “Broad exploration recommended”

---

## Priority 5 — Add longitudinal evidence carefully

Optional anonymous features:

- export a personal exploration plan;
- generate a non-identifying return token;
- allow users to revisit saved role comparisons;
- ask whether they read jobs or completed a project later.

This can improve retention measurement, but it also increases product and privacy complexity. It should not precede the baseline analysis.

---

## Recommended delivery sequence

### Week 1
- canonical event registry;
- event-contract CI test;
- data dictionary;
- data-quality SQL.

### Week 2
- session mart;
- baseline funnel;
- device and source segmentation.

### Week 3
- question-friction analysis;
- recommendation-quality analysis;
- first published case-study page.

### Week 4
- synthetic persona tests;
- sensitivity notebook;
- practitioner-review template.

### Week 5+
- launch one result-page experiment;
- publish readout after pre-defined sample requirements are met.

---

## What not to prioritize yet

Avoid spending the next cycle on:

- adding more role illustrations;
- adding more decorative result sections;
- replacing the rule system with an LLM;
- training a machine-learning model without valid labels;
- adding user accounts before proving retention value;
- claiming recommendation accuracy from a small convenience sample;
- building a complex dashboard before establishing data quality.

Those may look impressive but add less Product DS evidence than a clean analysis-to-decision loop.

---

## Strong portfolio endpoint

The project becomes interview-ready when the repository contains:

- a clearly framed user and product problem;
- a metric tree;
- a versioned recommendation approach;
- a canonical event dictionary;
- automated instrumentation checks;
- a session-level analytics mart;
- one reproducible baseline analysis;
- one recommendation-validation notebook;
- one product decision based on evidence;
- one experiment design or completed experiment;
- explicit limitations.

At that point, the project demonstrates product sense, data science, analytics engineering, experimentation, and communication in one coherent case.
