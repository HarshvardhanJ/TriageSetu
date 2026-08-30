"""
Does fusing the rule engine with the ML model actually reduce under-triage,
or is that just an assumed benefit? Test it on the held-out set.
"""
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split

df = pd.read_csv("/home/claude/model/synthetic_patients.csv")
clf = joblib.load("/home/claude/model/triage_model.joblib")

def clamp(x, lo, hi):
    return np.clip(x, lo, hi)

def make_features(row):
    band = row["age_band"]
    rr_hi = 30 if band == "pediatric" else (22 if band == "geriatric" else 20)
    temp_hi = 37.7 if band == "geriatric" else 38.0
    hr_base = 120 if band == "pediatric" else 100
    return [
        clamp((row["heart_rate"] - hr_base) / 20, -2, 4),
        clamp((row["respiratory_rate"] - rr_hi) / 6, -2, 4),
        clamp((95 - row["spo2"]) / 2, -2, 4),
        clamp((row["temperature"] - temp_hi) / 0.6, -2, 4),
        clamp((95 - row["systolic_bp"]) / 12, -2, 4),
        1 if row["avpu"] != "alert" else 0,
        1 if row["history_available"] else 0,
        row["chest"], row["breath"], row["neuro"], row["pregnancy"],
        row["bleed"], row["severe"],
        1 if band == "pediatric" else 0,
        1 if band == "geriatric" else 0,
    ]

def rule_tier(row):
    if row["avpu"] == "unresponsive" or row["avpu"] == "pain":
        return 1
    if row["active_bleeding"] or row["bleed"] == 1 or row["neuro"] == 1:
        return 1
    if row["spo2"] < 90:
        return 2
    if (row["chest"] == 1 and (row["heart_rate"] > 100 or row["respiratory_rate"] > 20 or row["spo2"] < 97)) or row["spo2"] < 95:
        return 3
    if (row["age_band"] == "pediatric" and row["respiratory_rate"] > 30) or \
       (row["age_band"] == "geriatric" and row["temperature"] >= 37.7) or \
       row["systolic_bp"] < 95:
        return 3
    return 5

X = np.array([make_features(r) for _, r in df.iterrows()])
y = df["esi_tier"].values
idx = np.arange(len(df))
_, idx_test = train_test_split(idx, test_size=0.2, random_state=42, stratify=y)

test_df = df.iloc[idx_test].reset_index(drop=True)
X_test = X[idx_test]
y_test = y[idx_test]

ml_pred = clf.predict(X_test)
rule_pred = test_df.apply(rule_tier, axis=1).values
fused_pred = np.minimum(ml_pred, rule_pred)

def under_triage_rate(pred, truth):
    mask = truth <= 2
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(pred[mask] > truth[mask]))

print(f"ML alone,        under-triage rate on tier 1-2: {under_triage_rate(ml_pred, y_test):.3f}")
print(f"Rule engine alone, under-triage rate on tier 1-2: {under_triage_rate(rule_pred, y_test):.3f}")
print(f"Fused (min of both), under-triage rate on tier 1-2: {under_triage_rate(fused_pred, y_test):.3f}")

print(f"\nML alone accuracy:    {np.mean(ml_pred == y_test):.3f}")
print(f"Fused accuracy:       {np.mean(fused_pred == y_test):.3f}")
print(f"Fused, over-triage rate (predicted MORE urgent than truth), all tiers: {np.mean(fused_pred < y_test):.3f}")
