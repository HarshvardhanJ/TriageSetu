"""
Synthetic ED patient generator for TriageSetu.

Important design choice: the ESI label is NOT computed from the same
normalized feature vector the model trains on. It's derived from a hidden
"true_acuity" latent variable that also (separately, with noise) generates
the observable vitals and symptom flags. This means the model has to learn
to infer acuity from noisy, imperfect signals, the way a real triage model
would from real (noisy, incomplete) clinical data. It is not just memorizing
a formula it was also given as input, which would be circular and wouldn't
prove anything about the model.

No real patient data is used or required, consistent with the brief:
"you are not expected to have access to a real company's proprietary data."
"""

import numpy as np
import pandas as pd

rng = np.random.default_rng(42)
N = 4000

def sample_age_band(n):
    # Roughly realistic ED mix: more adults, meaningful pediatric and geriatric share
    return rng.choice(["adult", "pediatric", "geriatric"], size=n, p=[0.55, 0.25, 0.20])

def sample_acuity(n):
    # Mixture: mostly low-acuity walk-ins, a moderate bucket, a smaller critical tail
    bucket = rng.choice(["low", "mod", "high"], size=n, p=[0.55, 0.30, 0.15])
    acuity = np.zeros(n)
    acuity[bucket == "low"] = rng.beta(2, 8, size=(bucket == "low").sum())
    acuity[bucket == "mod"] = rng.beta(3, 3, size=(bucket == "mod").sum())
    acuity[bucket == "high"] = rng.beta(6, 2, size=(bucket == "high").sum())
    return acuity

rows = []
for i in range(N):
    band = sample_age_band(1)[0]
    acuity = float(sample_acuity(1)[0])

    age = {
        "pediatric": rng.integers(0, 18),
        "adult": rng.integers(18, 65),
        "geriatric": rng.integers(65, 95),
    }[band]

    hr_base = {"pediatric": 105, "adult": 80, "geriatric": 78}[band]
    rr_base = {"pediatric": 24, "adult": 16, "geriatric": 17}[band]
    sbp_base = {"pediatric": 100, "adult": 115, "geriatric": 135}[band]  # geriatric often runs hypertensive at baseline

    # Under-reporting: a subset of geriatric patients present with blunted vital response
    # relative to true acuity (a known real phenomenon, and explicitly named in the brief).
    under_report = band == "geriatric" and rng.random() < 0.25
    acuity_signal = acuity * (0.55 if under_report else 1.0)

    heart_rate = hr_base + acuity_signal * 55 + rng.normal(0, 8)
    respiratory_rate = rr_base + acuity_signal * 16 + rng.normal(0, 2.5)
    spo2 = np.clip(99 - acuity_signal * 16 + rng.normal(0, 1.5), 70, 100)
    systolic_bp = sbp_base - acuity_signal * 35 + rng.normal(0, 9)
    # Fever: correlated with acuity but with an independent noise source, so some
    # low-acuity patients still spike a fever (a real, ambiguous presentation)
    temperature = 36.8 + acuity_signal * 1.6 + rng.normal(0, 0.6)
    if rng.random() < 0.08:
        temperature += rng.uniform(1.0, 2.0)  # isolated fever, not otherwise sick

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

# ---- Ground-truth ESI label: derived from true_acuity + hard safety overrides + label noise ----
def acuity_to_tier(a):
    if a > 0.85: return 1
    if a > 0.65: return 2
    if a > 0.40: return 3
    if a > 0.18: return 4
    return 5

tier = df["true_acuity"].apply(acuity_to_tier)

# Hard clinical overrides a real annotator would apply regardless of the acuity score
tier = np.where(df["avpu"] == "unresponsive", 1, tier)
tier = np.where((df["active_bleeding"] == 1) & (tier > 2), 2, tier)
tier = np.where(df["spo2"] < 89, np.minimum(tier, 2), tier)

# Label noise: real annotation/triage disagreement, +-1 tier on ~10% of rows
noise_mask = rng.random(N) < 0.10
tier = tier.astype(int)
tier[noise_mask] += rng.choice([-1, 1], size=noise_mask.sum())
tier = np.clip(tier, 1, 5)

df["esi_tier"] = tier
df.to_csv("/home/claude/model/synthetic_patients.csv", index=False)
print(f"Generated {len(df)} synthetic patients")
print(df["esi_tier"].value_counts().sort_index())
