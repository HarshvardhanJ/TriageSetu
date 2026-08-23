# TriageSetu prototype

Full-stack FastAPI + SQLite + scikit-learn prototype for the PatientTriage.ai Round 2 challenge.

## Run

Dependencies are installed in the included `.venv`. From this folder run:

```sh
./run.sh
```

Then open `http://localhost:8000`.

## Included demo behaviours

- 20 simulated records, including pediatric, geriatric, ambiguous, zero-history, and unconscious cases
- A real `HistGradientBoostingClassifier`, trained on reproducible synthetic data at service start
- Age-aware normalisation, parallel hard safety rules and ML prediction, fusion, confidence, and escalation under uncertainty
- 3× surge mode and 30-minute time advance for deterioration re-assessment
- Persisted SQLite queue and append-only audit ledger, including clinician ID, role, rationale, and tier changes
- New patient intake form for live scoring

This is a clinical workflow prototype only—not a diagnostic device or medical advice.
