/* Data Matters v3.14 scoring audit
   Run: node v3.14-scoring-audit.mjs
   This is a deterministic stress test, not an estimate of real user prevalence. */

const ROLES = ["DS", "MLE", "DABI", "DE", "OR", "STRAT", "PROD", "FIN", "GOV"];
const TIE_BREAK = ["DABI", "PROD", "STRAT", "DS", "DE", "OR", "MLE", "FIN", "GOV"];

const singles = {
  problem_type: [
    { DABI: 2, DS: 0.5 },
    { DS: 2, MLE: 0.5 },
    { OR: 2, STRAT: 0.5 },
    { PROD: 2, STRAT: 0.5 },
    { GOV: 1, FIN: 1 }
  ],
  system_type: [
    { DE: 2 },
    { MLE: 2, DS: 0.5 },
    { DABI: 2 },
    { PROD: 2, STRAT: 0.5 },
    { GOV: 2, FIN: 0.25 }
  ],
  math_pref: [
    { DABI: 2 },
    { DS: 2, MLE: 0.25 },
    { DS: 1.25, PROD: 0.75, DABI: 0.5 },
    { OR: 2 },
    { FIN: 2, STRAT: 0.5, OR: 0.25 }
  ],
  work_result: [
    { DABI: 2 },
    { PROD: 1.25, STRAT: 1.25 },
    { PROD: 1, DS: 1.25 },
    { DE: 1.25, GOV: 0.75 },
    { STRAT: 1, OR: 0.75, FIN: 0.75 }
  ],
  output_pref: [
    { DABI: 1.5, STRAT: 1 },
    { DS: 1.75, PROD: 0.5 },
    { DE: 1.25, MLE: 1.25 },
    { PROD: 2, STRAT: 0.5 },
    { OR: 2, FIN: 0.25 }
  ],
  responsibility: [
    { GOV: 2 },
    { FIN: 2 },
    { MLE: 1, DE: 1, DS: 0.25 },
    { PROD: 2 },
    { STRAT: 2, PROD: 0.25 }
  ]
};

const sliders = {
  coding_effort: { high: { MLE: 0.9, DE: 0.9, DS: 0.6, OR: 0.35 } },
  algorithm_effort: { high: { MLE: 0.9, DS: 0.9, OR: 0.7, FIN: 0.3 } },
  stakeholder_freq: { high: { STRAT: 0.9, PROD: 0.8, DABI: 0.5, FIN: 0.3 } },
  deep_focus: { high: { DS: 0.8, MLE: 0.8, DE: 0.7, OR: 0.7, FIN: 0.3 } },
  ambiguity: {
    high: { STRAT: 0.9, PROD: 0.8, DS: 0.6, OR: 0.5 },
    low: { DE: 0.4, GOV: 0.5, DABI: 0.3, FIN: 0.25 },
    lowWeight: 1
  },
  stable_delivery: { high: { DE: 0.9, GOV: 0.8, MLE: 0.6, DABI: 0.4, FIN: 0.35 } }
};

function maxPossible(role) {
  let total = 0;
  for (const options of Object.values(singles)) {
    total += Math.max(0, ...options.map(option => Number(option[role] || 0)));
  }
  for (const config of Object.values(sliders)) {
    const high = 2 * Number(config.high?.[role] || 0);
    const low = 2 * Number(config.lowWeight ?? 0.5) * Number(config.low?.[role] || 0);
    total += Math.max(high, low);
  }
  return total;
}

const maxScores = Object.fromEntries(ROLES.map(role => [role, maxPossible(role)]));

function scoreAnswers(answers) {
  const raw = Object.fromEntries(ROLES.map(role => [role, 0]));
  const evidence = Object.fromEntries(ROLES.map(role => [role, new Set()]));

  for (const [questionId, options] of Object.entries(singles)) {
    const selected = answers[questionId];
    if (!Number.isInteger(selected) || !options[selected]) continue;
    for (const [role, weight] of Object.entries(options[selected])) {
      raw[role] += weight;
      if (weight > 0) evidence[role].add(questionId);
    }
  }

  for (const [questionId, config] of Object.entries(sliders)) {
    const value = answers[questionId];
    if (!Number.isFinite(value)) continue;
    if (value >= 4) {
      for (const [role, weight] of Object.entries(config.high || {})) {
        const amount = (value - 3) * weight;
        raw[role] += amount;
        if (amount > 0) evidence[role].add(questionId);
      }
    }
    if (value <= 2 && config.low) {
      for (const [role, weight] of Object.entries(config.low)) {
        const amount = (3 - value) * Number(config.lowWeight ?? 0.5) * weight;
        raw[role] += amount;
        if (amount > 0) evidence[role].add(questionId);
      }
    }
  }

  const calibrated = Object.fromEntries(ROLES.map(role => {
    const normalized = maxScores[role] > 0 ? (raw[role] / maxScores[role]) * 10 : 0;
    const consistencyBonus = Math.min(evidence[role].size, 4) * 0.45;
    return [role, normalized + consistencyBonus];
  }));

  const ranked = ROLES.slice().sort((a, b) =>
    calibrated[b] - calibrated[a] ||
    evidence[b].size - evidence[a].size ||
    raw[b] - raw[a] ||
    TIE_BREAK.indexOf(a) - TIE_BREAK.indexOf(b)
  );

  return {
    raw,
    evidence: Object.fromEntries(ROLES.map(role => [role, evidence[role].size])),
    calibrated,
    ranked
  };
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function uniformStressTest(iterations = 100000) {
  const random = mulberry32(314);
  const counts = Object.fromEntries(ROLES.map(role => [role, 0]));
  for (let i = 0; i < iterations; i += 1) {
    const answers = {};
    for (const [questionId, options] of Object.entries(singles)) {
      answers[questionId] = randomInt(random, 0, options.length - 1);
    }
    for (const questionId of Object.keys(sliders)) {
      answers[questionId] = randomInt(random, 1, 5);
    }
    counts[scoreAnswers(answers).ranked[0]] += 1;
  }
  return Object.fromEntries(ROLES.map(role => [role, (counts[role] / iterations * 100).toFixed(2) + "%"]));
}

const personas = {
  DABI: { problem_type: 0, system_type: 2, math_pref: 0, work_result: 0, output_pref: 0, responsibility: 4, coding_effort: 2, algorithm_effort: 2, stakeholder_freq: 5, deep_focus: 3, ambiguity: 2, stable_delivery: 5 },
  DS: { problem_type: 1, system_type: 1, math_pref: 1, work_result: 2, output_pref: 1, responsibility: 2, coding_effort: 5, algorithm_effort: 5, stakeholder_freq: 2, deep_focus: 5, ambiguity: 5, stable_delivery: 3 },
  MLE: { problem_type: 1, system_type: 1, math_pref: 1, work_result: 2, output_pref: 2, responsibility: 2, coding_effort: 5, algorithm_effort: 5, stakeholder_freq: 2, deep_focus: 5, ambiguity: 4, stable_delivery: 5 },
  DE: { problem_type: 0, system_type: 0, math_pref: 0, work_result: 3, output_pref: 2, responsibility: 2, coding_effort: 5, algorithm_effort: 3, stakeholder_freq: 2, deep_focus: 5, ambiguity: 1, stable_delivery: 5 },
  OR: { problem_type: 2, system_type: 2, math_pref: 3, work_result: 4, output_pref: 4, responsibility: 1, coding_effort: 4, algorithm_effort: 5, stakeholder_freq: 3, deep_focus: 5, ambiguity: 5, stable_delivery: 3 },
  STRAT: { problem_type: 2, system_type: 3, math_pref: 4, work_result: 1, output_pref: 0, responsibility: 4, coding_effort: 2, algorithm_effort: 3, stakeholder_freq: 5, deep_focus: 3, ambiguity: 5, stable_delivery: 2 },
  PROD: { problem_type: 3, system_type: 3, math_pref: 2, work_result: 1, output_pref: 3, responsibility: 3, coding_effort: 3, algorithm_effort: 3, stakeholder_freq: 5, deep_focus: 3, ambiguity: 5, stable_delivery: 3 },
  FIN: { problem_type: 4, system_type: 4, math_pref: 4, work_result: 4, output_pref: 4, responsibility: 1, coding_effort: 3, algorithm_effort: 4, stakeholder_freq: 4, deep_focus: 4, ambiguity: 2, stable_delivery: 5 },
  GOV: { problem_type: 4, system_type: 4, math_pref: 0, work_result: 3, output_pref: 2, responsibility: 0, coding_effort: 3, algorithm_effort: 2, stakeholder_freq: 3, deep_focus: 4, ambiguity: 1, stable_delivery: 5 }
};

function personaAudit() {
  return Object.fromEntries(Object.entries(personas).map(([expectedRole, answers]) => {
    const result = scoreAnswers(answers);
    return [expectedRole, {
      top3: result.ranked.slice(0, 3),
      primaryCorrect: result.ranked[0] === expectedRole
    }];
  }));
}

function oneAnswerSensitivity() {
  const results = {};
  for (const [expectedRole, baseAnswers] of Object.entries(personas)) {
    let total = 0;
    let retainedPrimary = 0;
    let retainedTop3 = 0;

    for (const [questionId, options] of Object.entries(singles)) {
      for (let value = 0; value < options.length; value += 1) {
        if (value === baseAnswers[questionId]) continue;
        const changed = { ...baseAnswers, [questionId]: value };
        const ranked = scoreAnswers(changed).ranked;
        total += 1;
        if (ranked[0] === expectedRole) retainedPrimary += 1;
        if (ranked.slice(0, 3).includes(expectedRole)) retainedTop3 += 1;
      }
    }

    for (const questionId of Object.keys(sliders)) {
      for (let value = 1; value <= 5; value += 1) {
        if (value === baseAnswers[questionId]) continue;
        const changed = { ...baseAnswers, [questionId]: value };
        const ranked = scoreAnswers(changed).ranked;
        total += 1;
        if (ranked[0] === expectedRole) retainedPrimary += 1;
        if (ranked.slice(0, 3).includes(expectedRole)) retainedTop3 += 1;
      }
    }

    results[expectedRole] = {
      perturbations: total,
      primaryRetention: (retainedPrimary / total * 100).toFixed(1) + "%",
      top3Retention: (retainedTop3 / total * 100).toFixed(1) + "%"
    };
  }
  return results;
}

console.log("\nMax possible raw score by role");
console.table(Object.fromEntries(ROLES.map(role => [role, maxScores[role].toFixed(2)])));

console.log("\nUniform-answer opportunity stress test (artificial, not user prevalence)");
console.table(uniformStressTest(100000));

console.log("\nNine targeted personas");
console.dir(personaAudit(), { depth: null });

console.log("\nSingle-answer perturbation sensitivity");
console.table(oneAnswerSensitivity());
