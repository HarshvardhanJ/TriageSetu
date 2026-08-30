"""
Training v2. Two changes from v1:

1. Trained on the recalibrated dataset (generate_data.py v2), whose tier
   distribution now tracks published real-world ESI proportions instead of
   an invented shape.

2. Cost-sensitive training via sample_weight: samples where the true tier
   is 1 or 2 are weighted more heavily during training, so the model itself
   is penalized harder for under-triaging a critical patient during
   learning, not only corrected for it afterward by the rule-engine fusion.
   This puts the brief's asymmetric-cost requirement into two independent
   layers (model training + rule fusion) instead of one.
"""

import numpy as np
import pandas as pd
import json
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.inspection import permutation_importance
import joblib

df = pd.read_csv("/home/claude/model_v2/synthetic_patients.csv")

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

FEATURE_NAMES = ["heart_rate_dev", "resp_rate_dev", "spo2_dev", "temp_dev", "sbp_dev",
                  "avpu_abnormal", "history_available", "chest", "breath", "neuro",
                  "pregnancy", "bleed", "severe_cue", "pediatric_band", "geriatric_band"]

X = np.array([make_features(r) for _, r in df.iterrows()])
y = df["esi_tier"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Cost-sensitive weights: tier 1 costs 5x a routine miss, tier 2 costs 3x,
# tier 3 costs 1.5x, tiers 4-5 are the baseline. Chosen to be directionally
# correct and clearly stated, not fit to any external cost table, that
# table doesn't exist publicly for this application, be upfront about that
# if asked.
TIER_WEIGHTS = {1: 20.0, 2: 6.0, 3: 2.0, 4: 1.0, 5: 1.0}
sample_weight = np.array([TIER_WEIGHTS[t] for t in y_train])

clf = HistGradientBoostingClassifier(
    max_iter=250, max_depth=4, learning_rate=0.08, random_state=42
)
clf.fit(X_train, y_train, sample_weight=sample_weight)

y_pred = clf.predict(X_test)
report = classification_report(y_test, y_pred, output_dict=True)
cm = confusion_matrix(y_test, y_pred, labels=[1, 2, 3, 4, 5])

critical_mask = y_test <= 2
under_triage_rate = float(np.mean(y_pred[critical_mask] > y_test[critical_mask])) if critical_mask.sum() else 0.0

perm = permutation_importance(clf, X_test, y_test, n_repeats=10, random_state=42, n_jobs=-1)
importances = sorted(zip(FEATURE_NAMES, perm.importances_mean.tolist()), key=lambda t: -t[1])

results = {
    "version": "v2_cost_sensitive_recalibrated_distribution",
    "n_train": len(X_train), "n_test": len(X_test),
    "accuracy": report["accuracy"], "macro_f1": report["macro avg"]["f1-score"],
    "under_triage_rate_tier1_2": under_triage_rate,
    "tier_distribution_pct": (df["esi_tier"].value_counts(normalize=True).sort_index() * 100).round(1).to_dict(),
    "confusion_matrix_labels": [1, 2, 3, 4, 5], "confusion_matrix": cm.tolist(),
    "per_tier_recall": {str(k): report[str(k)]["recall"] for k in [1, 2, 3, 4, 5] if str(k) in report},
    "feature_importance": importances,
    "sample_weights_used": TIER_WEIGHTS,
}

with open("/home/claude/model_v2/eval_results.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"Accuracy: {results['accuracy']:.3f}  Macro F1: {results['macro_f1']:.3f}")
print(f"Under-triage rate (tier 1-2): {under_triage_rate:.3f}")
print("Per-tier recall:", {k: round(v, 3) for k, v in results["per_tier_recall"].items()})
print("Confusion matrix (rows=true, cols=pred, 1..5):")
print(cm)
print("Top feature importances:")
for name, imp in importances[:8]:
    print(f"  {name}: {imp:.4f}")

joblib.dump(clf, "/home/claude/model_v2/triage_model.joblib")
print("Saved triage_model.joblib")
