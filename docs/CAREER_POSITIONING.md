# LinkedIn and Resume Positioning

Use only claims supported by the repository and completed analysis. Do not insert traffic, uplift, accuracy, or conversion numbers until they have been verified.

---

## Recommended project title

**Data Matters — Product Analytics & Career Recommendation System**

Alternative for a more technical audience:

**Data Matters — Interpretable Career Recommendation and Product Analytics Platform**

Avoid using only “Career Quiz.” It understates the Product DS work.

---

## Resume version

### Two-bullet version

- Built a mobile-first career exploration product that maps user work preferences to 9 data-role families through a versioned, interpretable scoring system, with transparent explanations, adjacent-role comparisons, and real job examples.
- Designed privacy-conscious product analytics with anonymous sessions, funnel and question-level events, recommendation-fit feedback, clarity before/after measurement, and Supabase-backed instrumentation to support usability analysis and experimentation.

### Three-bullet version after completing the proposed analysis

- Built a mobile-first career exploration product that maps user work preferences to 9 data-role families using a versioned, interpretable recommendation system and role-level explanations.
- Designed an end-to-end Product Analytics framework covering acquisition, quiz progression, question friction, recommendation engagement, job exploration, perceived fit, and pre/post clarity.
- Developed a reproducible validation roadmap using event-quality checks, synthetic personas, recommendation-sensitivity analysis, confidence calibration, and a session-randomized result-page experiment.

### Stronger quantified version template

Use only after validation:

- Built a mobile-first career exploration product used by **[N] anonymous sessions**, mapping work preferences to 9 data-role families through an interpretable scoring model.
- Diagnosed **[largest funnel issue]** through session-level funnel and question-friction analysis, then redesigned **[feature]**, improving **[primary metric] by X%** with **[confidence interval / test design]**.
- Evaluated recommendation quality through perceived-fit ratings, top-three preference match, score-margin calibration, and local sensitivity tests, reducing **[identified failure mode] by X%**.

---

## LinkedIn project entry

### Project name

**Data Matters — Product Analytics & Career Recommendation System**

### Description

Built a mobile-first product that helps students distinguish data careers and identify roles worth exploring based on preferred work style rather than job-title familiarity.

Designed a versioned, interpretable recommendation system across 9 role families, with transparent recommendation reasons, adjacent-role comparison, job examples, and next-step guidance.

Instrumented the end-to-end product journey with anonymous first-party analytics, including quiz progression, question response behavior, recommendation engagement, job exploration, perceived accuracy, and pre/post career clarity. Built with vanilla JavaScript, Supabase/PostgreSQL, and Netlify.

Current analytical focus: event-quality validation, session-level funnel analysis, question-friction diagnostics, recommendation stability, confidence calibration, and result-page experimentation.

### Skills

Choose the five most relevant:

- Product Analytics
- Experiment Design
- Data Science
- SQL
- JavaScript

Other defensible options:

- Supabase
- PostgreSQL
- Metrics
- Recommendation Systems
- User Research
- Analytics Engineering

---

## LinkedIn featured-post version

Data career titles are easy to list and surprisingly hard to understand.

I built **Data Matters**, a mobile-first career exploration product that starts with how a person prefers to work—such as technical depth, ambiguity, collaboration, and problem type—and maps those preferences to 9 data-role families.

The Product Data Science work includes:

- an interpretable, versioned recommendation system;
- transparent result explanations and adjacent-role comparison;
- anonymous event instrumentation across the full funnel;
- pre/post career-clarity and perceived-fit measurement;
- a validation plan for recommendation stability and calibration;
- an experimentation roadmap for improving meaningful role and job exploration.

The next milestone is not another UI feature. It is a reproducible Product DS analysis: data-quality audit, session funnel, question-friction diagnosis, recommendation-quality evaluation, and one focused result-page experiment.

Live product: https://datamatters-hanks-career-board.netlify.app/  
GitHub: https://github.com/Hanklin999/DataMatters_CareerBoard

---

## 30-second interview explanation

> I built Data Matters because students often know broad titles like data analyst or data scientist but cannot distinguish the actual work. I framed it as a Product DS problem: reduce role confusion and increase meaningful career exploration. The current system uses an interpretable, versioned scoring model because I do not yet have valid labeled career outcomes. I instrumented the full anonymous user journey, including question behavior, funnel progression, recommendation engagement, job exploration, perceived fit, and clarity before and after the result. The next step is to validate the event data, build a session-level mart, test recommendation stability, and run a focused result-page experiment.

---

## Two-minute interview explanation

> The user problem is not a lack of career content. It is that most content assumes students already understand the titles. I designed the product around work preferences instead: how much technical depth, ambiguity, collaboration, system building, experimentation, or decision support a user prefers.
>
> Because there was no labeled dataset connecting quiz responses to long-term career satisfaction, I deliberately chose a transparent rule-based recommendation system instead of pretending that a machine-learning model would be more accurate. The output includes a top role, adjacent roles, explanation signals, role comparisons, and job examples.
>
> From a Product DS perspective, I defined success as meaningful exploration rather than quiz completion. I instrumented the funnel from landing through assessment, result, role comparison, job opening, external click, sharing, and feedback. I also collect optional clarity before and after the experience and perceived recommendation accuracy.
>
> The most important remaining work is validation. I would first audit event quality and build a session mart, then analyze abandonment and question friction. For the recommendation system, I would use synthetic persona tests, local sensitivity analysis, score-margin calibration, and practitioner review. Finally, I would run a session-randomized experiment on a concrete result-page CTA, using meaningful exploration as the primary metric and clarity as a guardrail.

---

## Interview questions this project should prepare you to answer

### Why not use machine learning?

There is no defensible labeled outcome yet. A learned model would optimize noise or proxy labels. Interpretability also makes user explanations, debugging, sensitivity analysis, and taxonomy review easier.

### What is the north-star metric?

Meaningful Career Exploration Rate: assessment completion followed by at least one high-intent action such as opening a role, comparing roles, opening a job, clicking an external source, or sharing the result.

### How would you validate recommendation quality?

Use four forms of evidence:

1. synthetic-persona regression tests;
2. local sensitivity and counterfactual analysis;
3. practitioner review of mappings;
4. user-perceived fit and preferred-role top-three match.

### Is clarity uplift causal?

Not by itself. It is a self-reported pre/post indicator and is subject to selection and demand effects. It becomes causal only for a randomized product comparison with proper exposure and analysis.

### What would you experiment on first?

A concrete, role-specific result-page CTA. It is close to the product objective, simple to randomize, and measurable with existing downstream events.

### What is the biggest technical risk?

Silent analytics loss caused by drift between event names emitted by the product, accepted by the client allowlist, and permitted by the database schema.

---

## Portfolio presentation order

Use this order on GitHub and during interviews:

1. user problem;
2. product hypothesis;
3. experience and recommendation logic;
4. metric tree;
5. event and data design;
6. analysis;
7. product decision;
8. validation;
9. experiment;
10. limitations.

Do not lead with the fantasy-role artwork or implementation details. They are product-design elements, not the core Product DS evidence.
