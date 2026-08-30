# Wiring this into TriageSetu

## What's in this folder
- `generate_data.py` — builds the 4,000-row synthetic dataset (`synthetic_patients.csv`), from a hidden acuity variable, not from the same formula the model is scored against
- `train_model.py` — trains `HistGradientBoostingClassifier`, evaluates it, saves `triage_model.joblib` and `eval_results.json`
- `validate_fusion.py` — the script that produced the under-triage comparison (ML alone vs. rules alone vs. fused)
- `eval_results.json` — accuracy, per-tier recall, confusion matrix, feature importances, in machine-readable form

## Two ways to use this, pick based on how much time you have

### Fast (recommended if you're close to the deadline)
Keep `triage.ts` exactly as it is architecturally, but:
1. Reweight `vitalBurden` in `features()`/`mlProxy` so SpO2 deviation counts for roughly 2x what the other four vitals count for, matching the real importance ranking (spo2_dev: 0.31 vs. next-highest at 0.08).
2. Rename `mlProxy` to something like `distilledModelScore`, and update the comment above it to say what's actually true: "Approximates a HistGradientBoostingClassifier trained on 4,000 synthetic patients (69.5% accuracy, see /model/eval_results.json). Distilled into a closed-form scorer here because the runtime is Node, not Python; the trained model, training script, and evaluation results are included in the repo for verification."
3. Update the two sentences in `README.md` that currently say "calibrated to mirror a trained... classifier, ported one-to-one from the original Python prototype" — replace with the same honest framing, and link to this folder.
4. Add the under-triage comparison table (22.5% / 16.2% / 10.3%) into the README under a "Why hybrid, not just ML" section. This is your strongest evidence for the asymmetric-cost requirement in the brief. Use it.

This makes every claim in your repo true, costs about twenty minutes, and doesn't touch your working demo's runtime behavior.

### Stretch (only if you have real time left)
Stand up a tiny FastAPI service that loads `triage_model.joblib` and exposes a `/score` endpoint, then call it from a single Next.js API route (`src/app/api/patients/[id]/score`) instead of the in-process TS function. Higher fidelity to "hybrid AI system," but it's a new deployment surface the night before a demo, which is its own risk. Only worth it if the fast option is already done and there's slack left.
