# Data Matters — Data Career Exploration Product

[Live Product](https://datamatters-hanks-career-board.netlify.app/) · [中文使用說明](README.zh-TW.md) · [Product DS Technical Notes](docs/PRODUCT_DS_TECHNICAL_NOTES.md) · [Analysis Roadmap](docs/PRODUCT_DS_ROADMAP.md)

Data Matters is a mobile-first career exploration product that helps students understand how data-related roles differ, identify work preferences, and move from an abstract career label to concrete roles, skills, and job examples.

This project is designed as a **Product Data Science case study**, not only a front-end career quiz. It combines:

- product problem framing;
- a transparent recommendation system;
- behavioral event instrumentation;
- user-perceived clarity and recommendation-fit measurement;
- privacy-conscious analytics;
- validation and experimentation planning.

> Current status: the product and analytics instrumentation are live. Any product impact metrics should be treated as exploratory until a sufficient sample size and data-quality review are completed.

---

## 1. Product problem

Students often encounter broad labels such as “data analyst,” “data scientist,” “data engineer,” or “product analyst,” but struggle to answer three more useful questions:

1. What does each role actually do every day?
2. Which type of work fits my preferences?
3. What should I explore next?

Most career content is organized around job titles, technical skills, or salary. That structure assumes users already understand the field. Data Matters instead starts from **work preferences**, then maps those preferences to role families and concrete job examples.

### Target users

Primary users:

- university students exploring data careers;
- early-career professionals considering a transition;
- users who know they “like data” but cannot distinguish adjacent roles.

### Job to be done

> “Help me quickly understand which data roles are worth exploring, why they may fit me, and what concrete action I should take next.”

---

## 2. Product hypothesis

The core product hypothesis is:

> If users answer questions about preferred work, technical depth, ambiguity, collaboration, and execution style, then a transparent role recommendation can reduce career confusion and increase the likelihood that they explore relevant roles or jobs.

The product therefore optimizes for more than quiz completion. It aims to improve:

- **career-role clarity**;
- **perceived recommendation fit**;
- **meaningful exploration behavior**;
- **transition from result to action**.

---

## 3. Product experience

The main user journey is:

1. Land on the product and understand its purpose.
2. Report baseline clarity about data careers.
3. Complete a multi-step preference assessment.
4. Receive a primary role recommendation and adjacent alternatives.
5. Review the reasons behind the recommendation.
6. Compare role families.
7. Explore real job examples and external sources.
8. Share the result or restart the assessment.
9. Report post-result clarity and recommendation accuracy.

The result page is intentionally structured as:

**identity → explanation → real work → alternatives → profile → jobs → next action**

This keeps the first screen simple while allowing users to inspect deeper reasoning when needed.

---

## 4. Recommendation system

Data Matters uses a rule-based, interpretable recommendation approach.

User responses represent preferences such as:

- coding and algorithmic effort;
- ambiguity tolerance;
- deep-focus preference;
- stakeholder interaction;
- stable delivery versus open-ended problem solving;
- preferred types of outputs and decisions.

Responses are mapped to weighted role-family dimensions. The system ranks role families and returns:

- a primary recommendation;
- adjacent alternatives;
- human-readable reasons;
- a confidence or exploration state;
- relevant role descriptions and job examples.

### Why an interpretable system?

For an early-stage career product, interpretability is more valuable than model complexity.

It allows the product to:

- explain why a role was recommended;
- debug unexpected outcomes;
- inspect sensitivity to individual answers;
- validate mappings with users and domain experts;
- change scoring logic without retraining a black-box model.

The current recommendation should be treated as a **decision-support heuristic**, not a psychological test or hiring assessment.

---

## 5. Product analytics design

The product includes privacy-conscious, first-party event tracking through Supabase.

### Measurement questions

The instrumentation is designed to answer:

- Where do users abandon the quiz?
- Which questions take the longest to answer?
- How often do users change an answer?
- Which recommended roles receive the most engagement?
- Do users explore adjacent roles or compare roles?
- Do users click job examples after seeing a result?
- Does self-reported career clarity improve after the experience?
- How accurately do users feel the recommendation represents them?
- Do shared results bring new users into the quiz?

### Example event groups

| Product area | Example events |
|---|---|
| Acquisition | landing view, referral source, UTM capture |
| Activation | quiz start, baseline clarity submission |
| Assessment | step view, question answer, response time, answer change |
| Recommendation | quiz completion, result view, primary role |
| Exploration | role open, alternate role open, role comparison |
| Action | job open, external job click, result share |
| Quality | clarity after, accuracy rating, feedback submission |
| Retention proxy | quiz restart, return through shared result |

### Privacy principles

- anonymous session identifiers;
- no account or login requirement;
- no fingerprinting;
- referrer stored only as a domain;
- event and property allowlists;
- no raw quiz answer object or DOM capture;
- front-end failures do not block product usage;
- database access controlled through Supabase Row Level Security.

---

## 6. Product metrics

### North-star candidate

**Meaningful Career Exploration Rate**

A session is considered meaningful when a user:

1. completes the assessment; and
2. performs at least one high-intent action, such as:
   - opening a recommended role;
   - comparing two roles;
   - opening a job example;
   - clicking an external job source;
   - sharing the result.

This metric is preferable to raw traffic or quiz completion because it captures whether the result leads to deeper exploration.

### Supporting metrics

**Acquisition**
- landing sessions;
- source and campaign mix;
- shared-result referral rate.

**Activation**
- quiz-start rate;
- baseline-clarity completion rate;
- first-step completion rate.

**Engagement**
- assessment completion rate;
- median completion time;
- question-level response time;
- answer-change rate;
- alternate-role exploration rate;
- role-comparison rate.

**Outcome**
- clarity uplift;
- average recommendation accuracy rating;
- job exploration rate;
- external-job click-through rate;
- result-share rate.

**Guardrails**
- mobile versus desktop completion gap;
- very fast completion rate;
- missing-event rate;
- duplicate-event rate;
- low-confidence result rate;
- result dissatisfaction rate.

---

## 7. Suggested analytical framework

A Product DS review should separate four layers:

### Funnel
`landing → quiz start → assessment completion → result view → role/job exploration`

### Diagnostic behavior
- time spent by question;
- answer changes;
- abandonment by step;
- device and acquisition-source differences.

### Recommendation quality
- perceived accuracy by top role;
- clarity uplift by result confidence;
- top-role acceptance versus adjacent-role selection;
- unstable recommendations under small answer changes.

### Product impact
- whether users leave with more clarity;
- whether they take an observable next step;
- whether result sharing creates qualified new sessions.

See [Product DS Technical Notes](docs/PRODUCT_DS_TECHNICAL_NOTES.md) for proposed SQL models, data-quality checks, recommendation validation, and experimentation methods.

---

## 8. Technical architecture

The current implementation is intentionally lightweight.

- **Front end:** HTML, CSS, vanilla JavaScript
- **Product logic:** rule-based role scoring and result rendering
- **Analytics:** first-party JavaScript event client
- **Data store:** Supabase / PostgreSQL
- **Deployment:** Netlify
- **Quality checks:** static linting, data validation, matching tests, analytics tests, product tests, build validation

### Local development

Requirements:

- Node.js 22 or later

```bash
npm install
npm run dev
```

### Validation

```bash
npm run validate
```

The validation command runs linting, data validation, automated tests, and a production build.

---

## 9. Repository structure

```text
.
├── index.html
├── app.js
├── product-v3.js
├── analytics.js
├── analytics-config.js
├── data/
├── docs/
├── images/
├── scripts/
├── supabase/
├── tests/
├── netlify/
└── package.json
```

Key files:

- `app.js`: core product state, assessment, scoring, role and job data behavior;
- `product-v3.js`: product UX layer, result experience, comparison and sharing behavior;
- `analytics.js`: anonymous event collection and payload controls;
- `supabase/`: database definitions and analytics infrastructure;
- `tests/`: product and analytics validation.

---

## 10. Validation strategy

The project should be validated at three levels.

### Technical validity
- scoring produces valid role rankings;
- all role families remain reachable;
- event schemas match the database;
- duplicate and malformed events are controlled;
- mobile and desktop flows behave consistently.

### Recommendation validity
- role mappings are reviewed by practitioners;
- representative user profiles produce expected rankings;
- small answer changes do not cause unreasonable rank reversals;
- perceived fit is analyzed by recommended role and confidence level.

### Product validity
- users understand the result;
- clarity improves after viewing it;
- users can distinguish adjacent roles;
- users take a relevant next action.

---

## 11. Current limitations

- The scoring weights are expert-defined rather than learned from labeled outcomes.
- Self-reported clarity and accuracy are subjective.
- A completed quiz does not prove that a career decision improved.
- Current traffic may be too small for causal conclusions.
- External-job clicks measure intent, not application or career outcomes.
- Anonymous sessions limit longitudinal retention analysis.
- Role and job taxonomies require periodic review.

These limitations are documented intentionally. The goal is to demonstrate sound product reasoning rather than overstate model precision.

---

## 12. Next milestones

Highest-value next steps:

1. Build a versioned analytics mart for sessions, funnels, recommendation outcomes, and data quality.
2. Run 15–20 moderated usability tests with target users.
3. Validate the role-weight mapping with practitioners from each role family.
4. Add recommendation stability and counterfactual explanation analysis.
5. Launch one focused A/B test on the result page.
6. Publish an analysis notebook or dashboard using real, privacy-safe aggregate data.
7. Define a feedback loop for revising questions and weights.

The detailed roadmap is available in [docs/PRODUCT_DS_ROADMAP.md](docs/PRODUCT_DS_ROADMAP.md).

---

## 13. Product DS interview discussion

This project can support interview conversations about:

- translating an ambiguous user problem into measurable outcomes;
- designing a recommendation system when labeled data is unavailable;
- defining a product metric tree;
- event taxonomy and instrumentation trade-offs;
- funnel and behavioral analysis;
- recommendation quality and calibration;
- experimentation under low traffic;
- privacy-by-design analytics;
- balancing interpretability, user experience, and technical complexity.

---

## 14. Disclaimer

Data Matters is an educational exploration tool. It does not provide psychological assessment, hiring evaluation, or guaranteed career advice. Recommendations should be combined with job research, project experience, coursework, and conversations with practitioners.
