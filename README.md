# TriageSetu

Safety-first emergency-department triage prototype. TriageSetu combines transparent rule-based safety nets with a model-derived risk tier, explicit uncertainty, clinician override, deterioration reassessment, and an append-only audit trail.

Built for the PatientTriage.ai track of the Accenture Innovation Challenge, Round 2.

> **Clinical safety boundary:** TriageSetu is a workflow prototype, not a diagnostic device or medical advice. Recommendations are advisory and require clinician review. Demo patient and ABHA records are synthetic.

## What is implemented

- Age-aware normalization for pediatric, adult, and geriatric patients.
- Hybrid rule + model-derived triage scoring with conservative fusion.
- Explicit confidence and uncertainty escalation.
- Red-flag safety rules for AVPU, bleeding, oxygenation, neurological symptoms, chest symptoms, and age-specific vital deviations.
- Live intake scoring before submission.
- Queue prioritization, surge mode, and wait-time deterioration reassessment.
- Clinician confirmation/override with rationale and audit logging.
- Clinical notes and patient-detail workflow.
- Bed board, staff roster, analytics, audit trail, and settings views.
- **ABHA history workflow:** consent-gated ABHA lookup, compact history display, masked ABHA storage, and audit logging.

## Architecture

```text
Browser / Next.js UI
        |
        v
Next.js Route Handlers
        |
        +---- Triage scoring engine
        |
        +---- ABDM/ABHA adapter ----> registered HIU/gateway (live mode)
        |
        v
Prisma + SQLite
```

The scoring engine runs in-process. The runtime does not call an external ML API; `src/lib/triage.ts` contains the closed-form model-tier distillation used by the prototype.

## Triage scoring

The intake is normalized into a 15-feature vector. Two paths run in parallel:

1. **Rule safety net** — hard safety rules that can immediately escalate critical presentations.
2. **Model tier** — a closed-form distillation of the classifier developed under `/model`.

The fused recommendation is conservative. Low confidence, rule/model disagreement, or missing prior history can trigger a one-level escalation. Surge mode and wait-time safety windows can escalate further.

Safety windows used by the prototype:

| Tier | Reassessment window |
|---|---:|
| ESI 1–2 | 15 min |
| ESI 3 | 30 min |
| ESI 4–5 | 90 min |

## ABHA / ABDM integration

### Important: ABHA is not a medical-record download key

ABHA identifies a person's digital health account. ABDM health records are exchanged through consent-based health-information flows between participating healthcare providers and Health Information Users (HIUs). A system must not treat an ABHA number as permission to retrieve a patient's entire record.

For this reason TriageSetu has a **consent gate** in the UI and keeps all ABHA credentials server-side.

### Demo mode — works immediately

The repository defaults to:

```env
ABDM_MODE="demo"
```

This is a deterministic synthetic adapter for demonstrations. Use either of these demo ABHA numbers:

```text
12345678901234
98765432109876
```

Workflow:

```text
New Intake
  -> enter ABHA number
  -> confirm patient/attendant consent
  -> Fetch history
  -> compact history appears
  -> Prior history becomes available
  -> submit intake
  -> masked ABHA + history snapshot are stored with the patient
```

The demo returns only triage-relevant categories:

- conditions
- allergies
- medications
- recent encounters

The raw ABHA number is not persisted in the patient record; only a masked value such as `XXXX-XXXX-1234` is retained.

### Live ABDM mode

For an actual ABDM deployment, the application must be onboarded as the appropriate ABDM participant and use the ABDM consent/health-information exchange. ABDM's architecture is consent based; it is not a centralized database from which an application can freely download records.

Set:

```env
ABDM_MODE="live"
ABDM_HISTORY_ENDPOINT="https://your-registered-hiu-gateway.example/api/abha/history"
ABDM_ACCESS_TOKEN="server-side-token"
```

`ABDM_HISTORY_ENDPOINT` is intentionally an adapter boundary rather than a hard-coded third-party service. Your registered HIU/gateway should perform the ABDM consent request, wait for the patient's approval, obtain the consent artefact, request the permitted health information, and normalize the resulting FHIR/ABDM records into the compact TriageSetu shape.

The browser never receives `ABDM_ACCESS_TOKEN`.

The adapter accepts these categories and intentionally discards unrelated record content before it reaches the triage UI:

```text
Condition
AllergyIntolerance
Medication / Prescription
OPConsultation
DiagnosticReport
```

### Why the prototype uses an adapter

ABDM integrations involve multiple parties and asynchronous consent/data flows. A simple `GET /history?abha=...` implementation would be misleading and unsafe. The adapter lets the prototype be fully demonstrable now while leaving a clean boundary for the registered ABDM HIU implementation.

## ABHA API endpoints in TriageSetu

### `POST /api/abha/history`

Request:

```json
{
  "abhaNumber": "12345678901234",
  "consent": true,
  "hospitalId": "..."
}
```

The server validates the 14-digit ABHA number and requires `consent: true`. It returns the compact history object and records an `ABHA_HISTORY_REQUEST` audit event containing only the last four ABHA digits.

### `POST /api/patients`

The intake request can include:

- `abha_number_masked`
- `abha_history`

The patient record therefore retains the history that was actually shown during intake, rather than requiring a second ABHA lookup merely to open the patient detail view.

## Privacy and safety decisions

- Explicit consent checkbox before history retrieval.
- ABHA credentials remain server-side.
- Raw ABHA numbers are not persisted in the patient record.
- Audit records retain only the last four ABHA digits.
- Only a small, triage-relevant subset of history is displayed.
- History is clinical context; it is not directly injected into the ML scorer.
- Missing history can lower confidence and trigger clinician review.
- Clinician overrides require a rationale and are audit logged.
- Break-glass access is separately represented in the intake and audit trail.

## UI changes

### New intake

The intake page is now divided into clear sections:

1. Patient identity
2. Vital signs
3. Presentation
4. Prior history / ABHA
5. Safety flags
6. Submission

The recommendation panel is kept separate and becomes sticky on large screens. This prevents the intake controls from competing with the scoring explanation.

### Patient detail modal

The patient modal was reorganized into:

```text
Header / identity / confidence
        |
        v
Vital-sign strip
        |
        +-------------------+
        |                   |
Clinical summary      Recommendation
Chief complaint       trace
Prior history         primary inputs
        |                   |
        +-------------------+
        |
Clinical notes
        |
Fixed action footer
```

The body scrolls independently while the tier/rationale/actions footer stays visible. This prevents the previous overlap and cramped action controls.

## Local setup

### Requirements

- Node.js 20+
- Bun 1.0+ recommended, or npm/pnpm

### Install

```bash
git clone https://github.com/HarshvardhanJ/TriageSetu.git
cd TriageSetu
bun install
bun run db:push
bun run dev
```

Open `http://localhost:3000`.

### Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

For a normal prototype demo, leave:

```env
ABDM_MODE="demo"
```

No ABDM credentials are required in demo mode.

## Useful commands

| Command | Purpose |
|---|---|
| `bun run dev` | Development server |
| `bun run build` | Production build |
| `bun run start` | Production server |
| `bun run lint` | ESLint |
| `bun run db:push` | Apply Prisma schema |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:reset` | Reset the demo database |

## Project structure

```text
TriageSetu/
├── model/                         # Synthetic training/evaluation material
├── prisma/
│   └── schema.prisma              # Database schema
├── src/
│   ├── app/
│   │   └── api/                   # Next.js API route handlers
│   │       └── abha/history/      # Consent-gated ABHA history endpoint
│   ├── components/
│   │   └── triage/
│   │       ├── intake-form.tsx    # Intake + ABHA workflow
│   │       ├── patient-detail.tsx # Patient modal + history + actions
│   │       ├── live-queue.tsx
│   │       ├── analytics.tsx
│   │       ├── bed-board.tsx
│   │       ├── staff-roster.tsx
│   │       ├── audit-trail.tsx
│   │       └── settings-view.tsx
│   └── lib/
│       ├── triage.ts              # Scoring engine
│       ├── service.ts             # DB/service layer
│       ├── api.ts                 # Browser API client
│       └── abha.ts                # Server-only ABHA/ABDM adapter
├── db/                            # Local SQLite database
├── .env.example
└── README.md
```

## Deployment notes

The current prototype uses SQLite. On Vercel/serverless infrastructure the filesystem is ephemeral, so it is suitable for a demonstration rather than durable clinical storage. A real deployment should use a managed database, proper authentication/authorization, secrets management, audit retention controls, security testing, and the required ABDM onboarding/security processes.

Do not put ABDM credentials in `NEXT_PUBLIC_*` environment variables or client-side code.

## ABDM references

- ABDM: https://abdm.gov.in/
- ABDM privacy policy: https://abdm.gov.in/static/media/New_Privacy_Policy.3833de7c114b64627a9d.pdf

## License

MIT
