# TriageSetu

### Intelligent, safety-first triage for faster emergency-care decisions

**Accenture Innovation Challenge 2026 · Prototype Development**  
**Track: PatientTriage.ai**

> **TriageSetu turns a crowded emergency-department queue into a continuously prioritized, explainable workflow — combining clinical safety rules, ML-assisted risk scoring, ABHA-enabled patient context, and clinician oversight.**

---

## The problem

Emergency departments operate under pressure: many patients arrive at once, clinical information is incomplete, and the order in which patients are reassessed can change rapidly as waiting time increases.

The challenge is not simply predicting risk. A useful triage system must answer four questions at the point of care:

1. **Who needs attention first?**
2. **Why was this patient prioritized?**
3. **How confident is the system?**
4. **What happens when the clinician disagrees or the patient's condition changes?**

TriageSetu is designed around these questions.

---

## Our solution

TriageSetu is a **clinician-in-the-loop emergency triage platform** built around a conservative hybrid decision architecture.

```text
Patient arrival
      │
      ▼
Structured intake ────────► ABHA / prior-history context
      │                              │
      ▼                              ▼
Clinical safety rules        Relevant patient history
      │                              │
      └──────────────┬───────────────┘
                     ▼
              ML risk estimation
                     │
                     ▼
            Conservative fusion
                     │
                     ▼
        ESI-prioritized queue
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   Clinician review       Reassessment loop
          │                     │
          ▼                     ▼
   Confirm / override     Escalate if needed
          │                     │
          └──────────┬──────────┘
                     ▼
              Audit trail
```

The result is not a black-box score. It is an **operational triage workflow** that keeps the clinician in control while making the reasoning and urgency visible.

---

## Why TriageSetu stands out

### 1. Safety-first hybrid intelligence

Instead of asking an ML model to make the entire decision, TriageSetu combines:

- **Hard clinical safety rules** for red-flag presentations.
- **Model-derived risk estimation** from structured patient signals.
- **Conservative fusion** when the two paths disagree.
- **Explicit confidence and uncertainty** rather than presenting every prediction as equally reliable.

Critical safety signals can therefore take priority over a lower model score.

### 2. Triage is dynamic, not a one-time prediction

A patient's position in the queue is not treated as permanent.

TriageSetu incorporates:

- wait-time tracking
- tier-specific reassessment windows
- deterioration escalation
- surge-mode prioritization
- continuous queue reprioritization

This reflects the real ED workflow: **the risk of a patient who has been waiting is not necessarily the same as the risk measured at arrival.**

### 3. Explainability at the point of care

Every recommendation exposes a compact decision trace:

```text
Rule safety net       → ESI tier
ML risk model         → ESI tier
                         ↓
System recommendation → ESI tier
                         ↓
Primary contributing inputs
```

Clinicians can see the reasoning without having to interpret a model dashboard or inspect raw probabilities.

### 4. ABHA-enabled patient context

Prior medical history can be brought into the triage workflow through a dedicated, consent-gated ABHA/ABDM integration layer.

The interface focuses on the information most useful during triage:

- relevant conditions
- allergies
- medications
- recent encounters

ABHA information is deliberately presented as **clinical context**, not as an automatic instruction to the scoring model.

The prototype includes a deterministic synthetic ABHA demonstration flow so the complete workflow can be evaluated without requiring real patient records.

### 5. Clinician authority is preserved

The system recommends; **the clinician decides**.

A clinician can:

- confirm the recommendation
- change the clinical tier
- provide a rationale
- transfer the patient
- mark treatment/disposition
- add clinical notes

Confirmation and overrides are recorded in the audit trail, creating accountability without removing human judgment.

---

# Core product experience

## 1. New patient intake

A structured intake captures the signals used by the triage engine:

- age and demographic information
- heart rate
- respiratory rate
- SpO₂
- temperature
- systolic blood pressure
- AVPU consciousness level
- chief complaint
- safety flags
- prior-history availability

The recommendation updates **live while the clinician types**, allowing the intake operator to see the emerging triage result before submitting the patient.

### ABHA workflow

```text
Enter ABHA number
       ↓
Confirm patient/attendant consent
       ↓
Fetch relevant history
       ↓
Review compact history
       ↓
Continue triage
```

The application masks the stored ABHA identifier and keeps the history retrieval behind a server-side adapter.

---

## 2. Live emergency queue

The queue is designed for rapid scanning rather than data-heavy administration.

Patients are surfaced using:

- ESI tier
- confidence
- wait time
- deterioration/reassessment state
- key red flags
- clinical status

Urgent patients remain visually prominent while lower-risk patients continue to be monitored rather than disappearing into a static list.

---

## 3. Patient detail workspace

Selecting a patient opens a dedicated clinical workspace containing:

- patient identity and current triage tier
- confidence level
- vital-sign strip
- clinical summary
- chief complaint
- prior history
- recommendation trace
- primary model inputs
- clinical notes
- clinician tier confirmation/override
- transfer and disposition actions

The modal uses an independently scrolling clinical body and a persistent action area so the decision controls remain immediately accessible.

---

## 4. Deterioration and reassessment

TriageSetu treats waiting as a clinical variable.

Prototype reassessment windows are tier-aware:

| Triage tier | Reassessment window |
|---|---:|
| ESI 1–2 | 15 min |
| ESI 3 | 30 min |
| ESI 4–5 | 90 min |

A patient whose waiting time crosses the safety boundary can be surfaced for reassessment rather than remaining passively ranked by the original intake score.

---

## 5. Surge mode

During periods of unusually high demand, the workflow can switch into **surge mode**, increasing the operational visibility of high-risk patients and tightening prioritization around the most important safety signals.

This is intended to support the exact environment where manual triage queues become hardest to manage: **many arrivals, limited attention, and rapidly changing priorities.**

---

# The intelligence layer

TriageSetu uses a 15-feature structured representation of the patient.

Two decision paths run independently:

### Rule safety net

Transparent safety rules identify presentations that require immediate escalation, including signals associated with:

- impaired consciousness
- severe bleeding
- oxygenation compromise
- neurological symptoms
- concerning chest symptoms
- age-specific vital-sign abnormalities

### Model-derived risk tier

The model path estimates a triage risk tier from the structured clinical signal.

The runtime uses the distilled scoring logic in `src/lib/triage.ts`, allowing the complete prototype to run locally without depending on an external inference service.

### Conservative fusion

The final recommendation considers:

```text
Rule result
     +
Model result
     +
Confidence / uncertainty
     +
History availability
     +
Wait-time / reassessment state
     ↓
Final recommended tier
```

When uncertainty or disagreement is meaningful, the system favors escalation and clinician review rather than false precision.

### Why fusion, not the model alone

Tested on held-out data, not assumed. The model path alone under-triages (assigns a less urgent tier than the true one) 17.7% of tier 1-2 patients. The rule engine alone under-triages 14.0%. Fused, as the production code actually runs, the under-triage rate drops to 4.7%. This is the measured effect of the design in `score()`, not an assertion of it. The training data, the trained model, and the script that produces these numbers are in `/model`, reproducible with `python3 model/validate_fusion.py`.

---

# Trust, privacy & accountability by design

Healthcare AI needs more than a good prediction. TriageSetu therefore treats **trust as a product feature**.

### Consent-aware health-data access

ABHA history retrieval is gated by an explicit consent action in the intake flow.

### Minimal data exposure

Only a compact, triage-relevant subset of patient history is surfaced in the UI.

### Masked identity storage

The raw ABHA number is not retained in the patient record; the displayed identifier is masked.

### Clinician override with rationale

A change to the recommended tier requires a clinical rationale, preserving the human decision behind the final action.

### Append-only audit trail

Important workflow events — including scoring, overrides, history access, and status changes — are recorded for traceability.

### Human-in-the-loop by default

TriageSetu is designed to **augment clinical prioritization, not replace clinical judgment**.

---

# Product modules

| Module | Purpose |
|---|---|
| **Live Queue** | Prioritized ED patient workflow |
| **New Intake** | Structured arrival assessment + live scoring |
| **ABHA History** | Consent-gated prior-history retrieval |
| **Patient Detail** | Explainable clinical review workspace |
| **Reassessment** | Wait-time safety monitoring |
| **Surge Mode** | High-load operational prioritization |
| **Bed Board** | Capacity visibility |
| **Staff Roster** | Operational staffing view |
| **Analytics** | Queue and triage insights |
| **Audit Trail** | Accountability and event history |
| **Settings** | Hospital/workflow configuration |

---

# Technology

TriageSetu is a full-stack web prototype built for rapid deployment and demonstration.

```text
Frontend
  Next.js 16
  React 19
  TypeScript
  Tailwind CSS
  Radix UI
  Framer Motion

Application
  Next.js Route Handlers
  Structured triage engine
  ABHA/ABDM adapter

Data
  Prisma ORM
  SQLite for the prototype

Visualization
  Recharts

State / UX
  Zustand
  React Query
  React Hook Form
```

The architecture keeps the scoring engine, service layer, API boundary, and UI components separated so the prototype can evolve into a larger clinical platform.

---

# ABHA / ABDM integration architecture

TriageSetu treats ABHA as an identity and consent-aware health-data entry point rather than as a direct medical-record download key.

```text
TriageSetu
    │
    ▼
Consent-aware ABHA workflow
    │
    ▼
ABHA / ABDM adapter
    │
    ├── Demo mode → synthetic health history
    │
    └── Live mode → registered ABDM/HIU integration
```

The adapter normalizes relevant information into a compact structure that the application can display consistently.

The live integration boundary is server-side so credentials are never exposed to the browser.

---

# Demo

The repository includes a synthetic ABHA demonstration flow for evaluating the complete user experience.

Demo ABHA numbers:

```text
12345678901234
98765432109876
```

To demonstrate the workflow:

1. Open **New Intake**.
2. Enter the patient's structured clinical information.
3. Enter one of the demo ABHA numbers.
4. Confirm consent.
5. Select **Fetch history**.
6. Review the returned conditions, allergies, medications, and encounters.
7. Submit the patient.
8. Open the patient from the queue to see the history alongside the recommendation trace.
9. Confirm or override the recommended tier with a clinical rationale.

This makes the entire workflow demonstrable from **arrival → history → scoring → queue → clinician review → disposition**.

---

# Running locally

### Requirements

- Node.js 20+
- Bun 1.0+ recommended

### Setup

```bash
git clone https://github.com/HarshvardhanJ/TriageSetu.git
cd TriageSetu
bun install
bun run db:push
bun run dev
```

Open:

```text
http://localhost:3000
```

### Environment

Create `.env.local` from `.env.example`.

For the included demonstration workflow:

```env
ABDM_MODE="demo"
```

No external ABHA credentials are required for the synthetic demo.

---

# Useful commands

```bash
bun run dev          # Development server
bun run build        # Production build
bun run start        # Production server
bun run lint         # ESLint
bun run db:push      # Apply Prisma schema
bun run db:generate  # Generate Prisma client
bun run db:reset     # Reset demo database
```

---

# Repository structure

```text
TriageSetu/
├── model/                       # Model development / evaluation material
├── prisma/
│   └── schema.prisma            # Database schema
├── src/
│   ├── app/
│   │   └── api/                 # API route handlers
│   │       └── abha/history/    # ABHA history endpoint
│   ├── components/
│   │   └── triage/              # Clinical workflow UI
│   │       ├── intake-form.tsx
│   │       ├── patient-detail.tsx
│   │       ├── live-queue.tsx
│   │       ├── analytics.tsx
│   │       ├── bed-board.tsx
│   │       ├── staff-roster.tsx
│   │       ├── audit-trail.tsx
│   │       └── settings-view.tsx
│   └── lib/
│       ├── triage.ts             # Triage scoring engine
│       ├── service.ts            # Data/service layer
│       ├── api.ts                # Browser API client
│       └── abha.ts               # ABHA/ABDM adapter
├── db/                           # Prototype database
├── .env.example
└── README.md
```

---

# Vision

TriageSetu's goal is simple:

> **Make the right patient visible at the right time, while keeping the clinician in control.**

The prototype brings together three capabilities that are often separated in emergency-care software:

**clinical safety intelligence + longitudinal patient context + operational queue management.**

The result is a triage workflow designed not merely to predict risk, but to help emergency teams **act on risk, explain it, reassess it, and remain accountable for the final decision.**

---

## Team

**TriageSetu**  
Accenture Innovation Challenge 2026 · PatientTriage.ai

---

## License

MIT
