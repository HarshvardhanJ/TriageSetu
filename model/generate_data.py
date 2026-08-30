"""
Synthetic ED patient generator, v2.

Change from v1: the acuity-to-tier thresholds are no longer arbitrary cutoffs
(0.85/0.65/0.40/0.18). They're now set as empirical quantiles of the acuity
distribution itself, chosen to land close to published real-world ESI tier
proportions (tier 3 as the largest single group, tiers 1 and 5 both small),
based on the ESI implementation handbook's expected ranges and a large
(n=64,891) hospital triage study. v1's distribution had this close to
inverted (tiers 4/5 dominant, tier 3 one of the smallest), which is not
how real EDs distribute. This does not make the data real, it makes the
shape of the simulation match a real, checkable reference instead of an
invented one.

Same non-circularity property as v1: the label depends on a hidden
true_acuity value that separately (and noisily) generates the observable
vitals and symptoms, so the model still has to infer, not memorize.
"""

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
N = 4000

def sample_age_band(n):
    return rng.choice(["adult", "pediatric", "geriatric"], size=n, p=[0.55, 0.25, 0.20])

def sample_acuity(n):
    bucket = rng.choice(["low", "mod", "high"], size=n, p=[0.55, 0.30, 0.15])
    acuity = np.zeros(n)
    acuity[bucket == "low"] = rng.beta(2, 8, size=(bucket == "low").sum())
    acuity[bucket == "mod"] = rng.beta(3, 3, size=(bucket == "mod").sum())
    acuity[bucket == "high"] = rng.beta(6, 2, size=(bucket == "high").sum())
    return acuity

rows = []
acuities = sample_acuity(N)
bands = sample_age_band(N)

for i in range(N):
    band = bands[i]
    acuity = float(acuities[i])

    age = {
        "pediatric": rng.integers(0, 18),
        "adult": rng.integers(18, 65),
        "geriatric": rng.integers(65, 95),
    }[band]

    hr_base = {"pediatric": 105, "adult": 80, "geriatric": 78}[band]
    rr_base = {"pediatric": 24, "adult": 16, "geriatric": 17}[band]
    sbp_base = {"pediatric": 100, "adult": 115, "geriatric": 135}[band]

    under_report = band == "geriatric" and rng.random() < 0.25
    acuity_signal = acuity * (0.55 if under_report else 1.0)

    heart_rate = hr_base + acuity_signal * 55 + rng.normal(0, 8)
    respiratory_rate = rr_base + acuity_signal * 16 + rng.normal(0, 2.5)
    spo2 = np.clip(99 - acuity_signal * 16 + rng.normal(0, 1.5), 70, 100)
    systolic_bp = sbp_base - acuity_signal * 35 + rng.normal(0, 9)
    temperature = 36.8 + acuity_signal * 1.6 + rng.normal(0, 0.6)
    if rng.random() < 0.08:
        temperature += rng.uniform(1.0, 2.0)

    avpu = "alert"
    if acuity > 0.88 and rng.random() < 0.6:
        avpu = rng.choice(["voice", "pain", "unresponsive"], p=[0.5, 0.3, 0.2])

    p_symptom = 0.10 + 0.7 * acuity_signal
    chest = int(rng.random() < p_symptom * 0.5)
    breath = int(rng.random() < p_symptom * 0.5)
    neuro = int(rng.random() < p_symptom * 0.25 * (1 if acuity > 0.6 else 0.3))
    bleed = int(rng.random() < 0.04 + 0.15 * acuity)
    severe_cue = int(rng.random() < p_symptom * 0.4)
    pregnancy = int(band == "adult" and rng.random() < 0.02)

    history_available = int(rng.random() < 0.5)
    active_bleeding = int(bleed and rng.random() < 0.6)

    rows.append(dict(
        age=age, age_band=band, heart_rate=round(heart_rate, 1),
        respiratory_rate=round(respiratory_rate, 1), spo2=round(float(spo2), 1),
        systolic_bp=round(systolic_bp, 1), temperature=round(temperature, 2),
        avpu=avpu, history_available=history_available,
        chest=chest, breath=breath, neuro=neuro, bleed=bleed,
        severe=severe_cue, pregnancy=pregnancy, active_bleeding=active_bleeding,
        true_acuity=round(acuity, 4),
    ))

df = pd.DataFrame(rows)

# ---- Quantile-calibrated thresholds, target proportions from published ESI data ----
# tier1 ~2%, tier2 ~18%, tier3 ~38% (largest), tier4 ~30%, tier5 ~12%
target_cum = {"t1": 0.02, "t2": 0.20, "t3": 0.58, "t4": 0.88}  # cumulative, most urgent first
q_t1 = np.quantile(df["true_acuity"], 1 - target_cum["t1"])
q_t2 = np.quantile(df["true_acuity"], 1 - target_cum["t2"])
q_t3 = np.quantile(df["true_acuity"], 1 - target_cum["t3"])
q_t4 = np.quantile(df["true_acuity"], 1 - target_cum["t4"])

def acuity_to_tier(a):
    if a > q_t1: return 1
    if a > q_t2: return 2
    if a > q_t3: return 3
    if a > q_t4: return 4
    return 5

tier = df["true_acuity"].apply(acuity_to_tier)

# Hard clinical overrides, same as v1
tier = np.where(df["avpu"] == "unresponsive", 1, tier)
tier = np.where((df["active_bleeding"] == 1) & (tier > 2), 2, tier)
tier = np.where(df["spo2"] < 89, np.minimum(tier, 2), tier)

noise_mask = rng.random(N) < 0.10
tier = tier.astype(int)
tier[noise_mask] += rng.choice([-1, 1], size=noise_mask.sum())
tier = np.clip(tier, 1, 5)

df["esi_tier"] = tier
df.to_csv("/home/claude/model_v2/synthetic_patients.csv", index=False)
print(f"Generated {len(df)} synthetic patients")
print(df["esi_tier"].value_counts(normalize=True).sort_index().apply(lambda x: f"{x:.1%}"))
