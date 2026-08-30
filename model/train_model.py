"""
Trains the real classifier that src/lib/triage.ts's mlProxy claims to mirror.

Feature extraction below is a line-for-line match of features() in triage.ts
so the trained model's importances map onto the same 15 named features the
TypeScript engine already exposes in FEATURE_NAMES.
"""

import numpy as np
import pandas as pd
import json
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, recall_score
from sklearn.inspection import permutation_importance

df = pd.read_csv("/home/claude/model/synthetic_patients.csv")

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

clf = HistGradientBoostingClassifier(
    max_iter=200, max_depth=4, learning_rate=0.08, random_state=42
)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
report = classification_report(y_test, y_pred, output_dict=True)
cm = confusion_matrix(y_test, y_pred, labels=[1, 2, 3, 4, 5])

# The metric that matters most for this brief: recall on tier 1-2 (missing a
# critical patient, i.e. predicting a LESS urgent tier than truth, is the
# expensive error). Compute "under-triage rate": fraction of true tier<=2
# patients predicted at a less urgent tier.
critical_mask = y_test <= 2
under_triage_rate = float(np.mean(y_pred[critical_mask] > y_test[critical_mask])) if critical_mask.sum() else 0.0

perm = permutation_importance(clf, X_test, y_test, n_repeats=10, random_state=42, n_jobs=-1)
importances = sorted(
    zip(FEATURE_NAMES, perm.importances_mean.tolist()),
    key=lambda t: -t[1]
)

results = {
    "n_train": len(X_train),
    "n_test": len(X_test),
    "accuracy": report["accuracy"],
    "macro_f1": report["macro avg"]["f1-score"],
    "under_triage_rate_tier1_2": under_triage_rate,
    "confusion_matrix_labels": [1, 2, 3, 4, 5],
    "confusion_matrix": cm.tolist(),
    "per_tier_recall": {str(k): report[str(k)]["recall"] for k in [1, 2, 3, 4, 5] if str(k) in report},
    "feature_importance": importances,
}

with open("/home/claude/model/eval_results.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"Accuracy: {results['accuracy']:.3f}")
print(f"Macro F1: {results['macro_f1']:.3f}")
print(f"Under-triage rate (tier 1-2 predicted less urgent): {under_triage_rate:.3f}")
print("\nPer-tier recall:")
for k, v in results["per_tier_recall"].items():
    print(f"  Tier {k}: {v:.3f}")
print("\nConfusion matrix (rows=true, cols=predicted, order 1..5):")
print(cm)
print("\nTop feature importances (permutation):")
for name, imp in importances[:8]:
    print(f"  {name}: {imp:.4f}")

import joblib
joblib.dump(clf, "/home/claude/model/triage_model.joblib")
print("\nSaved model to triage_model.joblib")
