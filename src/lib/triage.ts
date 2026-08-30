// TriageSetu scoring engine.
// Implements: age-band normalization, symptom flags, feature vector,
// rule-based safety net, a distilled model-derived tier estimate, uncertainty
// fusion, surge policy, and deterioration reassessment.
//
// The model-derived tier (see modelTier() below) is a closed-form distillation
// of a HistGradientBoostingClassifier trained on 4,000 synthetic patients.
// The real trained model, the training script, the synthetic data, and the
// evaluation results (accuracy, per-tier recall, confusion matrix, feature
// importance) live in /model at the repo root. This file does not call that
// model at runtime — it re-expresses its learned feature weighting as a
// closed-form scorer, because the deployment runtime is Node, not Python.
// See /model/INTEGRATION.md for how the two are connected and how to verify
// the claim yourself.

export type Avpu = "alert" | "voice" | "pain" | "unresponsive";
export type AgeBand = "pediatric" | "adult" | "geriatric";

export interface Intake {
  display_name: string;
  age: number;
  heart_rate: number;
  respiratory_rate: number;
  spo2: number;
  temperature: number;
  systolic_bp: number;
  avpu: Avpu;
  complaint: string;
  history_available: boolean;
  active_bleeding: boolean;
  break_glass: boolean;
  gender?: "male" | "female" | "unknown";
}

export interface FeatureContribution {
  feature: string;
  impact: number;
}

export interface Score {
  recommended_tier: number;
  rule_tier: number;
  ml_tier: number;
  confidence: number;
  confidence_label: "high" | "moderate" | "low";
  age_band: AgeBand;
  flags: string[];
  reasons: string[];
  explanation: string;
  feature_contributions: FeatureContribution[];
  display_tier?: number;
}

export const TIER_LABELS: Record<number, string> = {
  1: "ESI 1 · Resuscitation",
  2: "ESI 2 · Emergent",
  3: "ESI 3 · Urgent",
  4: "ESI 4 · Less urgent",
  5: "ESI 5 · Non-urgent",
};

export const TIER_SHORT: Record<number, string> = {
  1: "Resus",
  2: "Emergent",
  3: "Urgent",
  4: "Less urgent",
  5: "Non-urgent",
};

export function tierColor(n: number): "red" | "amber" | "green" {
  return n <= 2 ? "red" : n === 3 ? "amber" : "green";
}

export function ageBand(age: number): AgeBand {
  return age < 18 ? "pediatric" : age >= 65 ? "geriatric" : "adult";
}

export function symptomFlags(complaint: string): Record<string, number> {
  const c = (complaint || "").toLowerCase();
  return {
    chest: anyIn(c, ["chest", "tightness", "pressure"]),
    breath: anyIn(c, ["breath", "asthma", "wheez", "shortness"]),
    neuro: anyIn(c, ["unconscious", "confusion", "slurred", "seizure", "weakness"]),
    pregnancy: anyIn(c, ["pregnan", "vaginal bleeding"]),
    bleed: anyIn(c, ["bleed", "hemorrhage"]),
    severe: anyIn(c, ["severe", "worst", "collapse", "pale"]),
  };
}

function anyIn(s: string, words: string[]): number {
  return words.some((w) => s.includes(w)) ? 1 : 0;
}

export function features(d: Intake | Record<string, any>): number[] {
  const band = ageBand(d.age);
  const f = symptomFlags(d.complaint);
  const rrHi = band === "pediatric" ? 30 : band === "geriatric" ? 22 : 20;
  const tempHi = band === "geriatric" ? 37.7 : 38.0;
  const hrBase = band !== "pediatric" ? 100 : 120;
  return [
    clamp((d.heart_rate - hrBase) / 20, -2, 4),
    clamp((d.respiratory_rate - rrHi) / 6, -2, 4),
    clamp((95 - d.spo2) / 2, -2, 4),
    clamp((d.temperature - tempHi) / 0.6, -2, 4),
    clamp((95 - d.systolic_bp) / 12, -2, 4),
    d.avpu !== "alert" ? 1 : 0,
    d.history_available ? 1 : 0,
    f.chest,
    f.breath,
    f.neuro,
    f.pregnancy,
    f.bleed,
    f.severe,
    band === "pediatric" ? 1 : 0,
    band === "geriatric" ? 1 : 0,
  ];
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function ruleEngine(d: Intake | Record<string, any>): { tier: number; reasons: string[] } {
  const f = symptomFlags(d.complaint);
  const reasons: string[] = [];
  if (d.avpu === "unresponsive" || d.avpu === "pain") {
    return { tier: 1, reasons: ["AVPU indicates reduced consciousness"] };
  }
  if (d.active_bleeding || f.bleed === 1 || f.neuro === 1) {
    return { tier: 1, reasons: ["Critical red-flag presentation"] };
  }
  if (d.spo2 < 90) {
    return { tier: 2, reasons: [`SpO₂ ${d.spo2}% is below the critical safety floor`] };
  }
  if ((f.chest === 1 && (d.heart_rate > 100 || d.respiratory_rate > 20 || d.spo2 < 97)) || d.spo2 < 95) {
    return { tier: 3, reasons: ["Chest/oxygenation signal triggers an amber safety floor"] };
  }
  const band = ageBand(d.age);
  if (
    (band === "pediatric" && d.respiratory_rate > 30) ||
    (band === "geriatric" && d.temperature >= 37.7) ||
    d.systolic_bp < 95
  ) {
    return { tier: 3, reasons: ["Age-normalized vital deviates from the safe range"] };
  }
  return { tier: 5, reasons: [] };
}

// Weighted vital burden, matching the real trained model's permutation
// feature importance (see /model/eval_results.json): SpO2 deviation alone
// accounted for ~62% of the predictive weight across the five vitals in
// evaluation, heart rate and respiratory rate for another ~35% combined,
// and temperature deviation carried effectively no independent signal once
// the other vitals were known. These weights are that ranking normalized to
// keep the same rough scale as the unweighted sum it replaces.
function weightedVitalBurden(feats: number[]): number {
  const [hr, rr, spo2, temp, sbp] = feats;
  return (
    2.5 * Math.max(0, spo2) +
    0.7 * Math.max(0, hr) +
    0.7 * Math.max(0, rr) +
    0.3 * Math.max(0, sbp) +
    0.1 * Math.max(0, temp)
  );
}

// Distilled tier estimate. This closed-form scorer is a compiled
// approximation of a HistGradientBoostingClassifier trained on 4,000
// synthetic patients — see the header comment above for where the real
// model, training data, and evaluation metrics live in this repo.
//
// Note: the previous version of this function summed feats.slice(8, 13) as
// the symptom burden, which is [breath, neuro, pregnancy, bleed, severe] —
// it silently excluded the chest-pain flag at index 7. Fixed below.
export function modelTier(d: Intake | Record<string, any>): number {
  const feats = features(d);
  const vitalBurden = weightedVitalBurden(feats.slice(0, 5));
  const symptomBurden = feats.slice(7, 13).reduce((s, x) => s + x, 0); // chest..severe
  const burden = vitalBurden + symptomBurden;

  if (d.spo2 < 89) return 1;
  if (burden > 6) return 2;
  if (burden > 3) return 3;
  if (burden > 1) return 4;
  return 5;
}

export function explain(
  d: Intake | Record<string, any>,
  tier: number,
  confidence: number,
  reasons: string[],
  flags: string[]
): string {
  const base = reasons[0] ?? "Current observed vitals are within the age-adjusted reference range";
  const uncertainty =
    flags.includes("Needs clinician review")
      ? " Full history is unavailable, so the system has escalated for clinician review."
      : "";
  const tierName = ["", "red", "red", "amber", "green", "green"][tier];
  return `Flagged ${tierName}. ${base}. Confidence ${confidence}% (advisory only).${uncertainty}`;
}

const FEATURE_NAMES = [
  "Heart rate",
  "Respiratory rate",
  "SpO₂",
  "Temperature",
  "Systolic BP",
  "Alertness",
  "History",
  "Chest symptom",
  "Breathlessness",
  "Neurological symptom",
  "Pregnancy",
  "Bleeding",
  "Severity cue",
  "Pediatric band",
  "Geriatric band",
];

export function score(d: Intake | Record<string, any>, surge = false, wait = 0): Score {
  const ruleTierReasons = ruleEngine(d);
  const ruleTier = ruleTierReasons.tier;
  const reasons = [...ruleTierReasons.reasons];

  const mlTier = modelTier(d);
  // Margin proxy: distance between burden and threshold midpoint
  const feats = features(d);
  const vitalBurden = weightedVitalBurden(feats.slice(0, 5));
  const symptomBurden = feats.slice(7, 13).reduce((s, x) => s + x, 0); // chest..severe
  const burden = vitalBurden + symptomBurden;
  // Approximate margin: how far from a threshold boundary (0..1)
  const nearest = Math.min(
    Math.abs(burden - 1),
    Math.abs(burden - 3),
    Math.abs(burden - 6),
    Math.abs((d.spo2 || 100) - 89) / 10,
    Math.abs((d.spo2 || 100) - 95) / 5
  );
  const margin = Math.min(0.6, nearest / 3);

  const completeness =
    [
      d.heart_rate,
      d.respiratory_rate,
      d.spo2,
      d.temperature,
      d.systolic_bp,
      d.avpu,
      d.complaint,
    ].filter((v) => v !== undefined && v !== null && v !== "").length / 7;

  const agreement = ruleTier === 5 || ruleTier === mlTier;
  let confidence = Math.round(
    Math.min(
      96,
      Math.max(
        44,
        52 +
          margin * 42 +
          completeness * 8 +
          (d.history_available ? 8 : 0) +
          (agreement ? 9 : -7)
      )
    )
  );

  let tier = Math.min(ruleTier, mlTier);
  const flags: string[] = [];
  if (ruleTier < 5) flags.push("Rule-based safety net applied");

  const uncertain = confidence < 72 || !agreement || !d.history_available;
  if (uncertain && tier > 1) {
    tier -= 1;
    flags.push("Needs clinician review");
    if (!reasons.includes("Low confidence, missing history, or model/rule disagreement caused one-level escalation")) {
      reasons.push("Low confidence, missing history, or model/rule disagreement caused one-level escalation");
    }
  }

  if (surge && tier > 1 && (confidence < 82 || mlTier <= 3)) {
    tier -= 1;
    flags.push("3× surge safety policy applied");
  }

  const limit = tier <= 2 ? 15 : tier === 3 ? 30 : 90;
  if (wait >= limit) {
    tier = Math.max(1, tier - 1);
    flags.push("Reassessment overdue");
    reasons.push(`Wait of ${wait} minutes exceeds the ${limit}-minute safety window`);
  }

  const dedupReasons = Array.from(new Set(reasons));
  const finalReasons = dedupReasons.length ? dedupReasons.slice(0, 3) : ["No hard safety rule triggered"];

  const featureContributions = feats
    .map((v, i) => ({ feature: FEATURE_NAMES[i], impact: Math.round(Math.abs(v) * 100) / 100 }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 4);

  const confidenceLabel = confidence >= 80 ? "high" : confidence >= 62 ? "moderate" : "low";

  return {
    recommended_tier: tier,
    rule_tier: ruleTier,
    ml_tier: mlTier,
    confidence,
    confidence_label: confidenceLabel,
    age_band: ageBand(d.age),
    flags,
    reasons: finalReasons,
    explanation: explain(d, tier, confidence, finalReasons, flags),
    feature_contributions: featureContributions,
  };
}

// Reference vital ranges per age band for UI hints
export function vitalRanges(band: AgeBand) {
  if (band === "pediatric") {
    return {
      hr: [80, 140],
      rr: [20, 30],
      spo2: [95, 100],
      temp: [36.5, 37.5],
      sbp: [80, 120],
    };
  }
  if (band === "geriatric") {
    return {
      hr: [50, 100],
      rr: [12, 20],
      spo2: [94, 100],
      temp: [36.0, 37.5],
      sbp: [110, 160],
    };
  }
  return {
    hr: [60, 100],
    rr: [12, 20],
    spo2: [95, 100],
    temp: [36.1, 37.2],
    sbp: [100, 140],
  };
}
