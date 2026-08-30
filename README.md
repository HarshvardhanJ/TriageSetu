# TriageSetu — Safety-first AI triage for emergency care

A full-stack clinical decision-support prototype that helps emergency department staff prioritize and route patients as they arrive. Built for the **PatientTriage.ai** track of the Accenture Innovation Challenge.

> ⚠️ This is a clinical workflow prototype — **not a diagnostic device or medical advice**. The scoring engine runs entirely in-process; no external model API calls are made.

---

## ✨ What's inside

### Hybrid scoring engine (faithful TypeScript port)
- **Age-band normalization** (pediatric <18 · adult 18–64 · geriatric ≥65)
- **Hard safety rules** — AVPU, active bleeding, SpO₂ floors, age-specific thresholds
- **ML proxy** calibrated to mirror a trained `HistGradientBoostingClassifier`'s burden formula
- **Uncertainty fusion** — confidence reflects model agreement, history availability, feature completeness
- **Escalation policy** — rules can only escalate, never downgrade
- **Surge protocol** (3×) auto-escalates borderline cases
- **Deterioration reassessment** — wait-time safety windows (15/30/90 min per tier)

### Beautiful 3D newspaper-style hero landing
On first load, users see "The Clinical Times" — a 3D, animated broadsheet special report on the state of healthcare in India, with:
- Authentic aged-cream paper texture (`#DCCFB0`) with foxing, grain, and vignette
- Three newspaper fonts: **UnifrakturMaguntia** (blackletter masthead), **Playfair Display** (Didone headlines), **Lora** (old-style serif body)
- Mouse-tracked 3D paper tilt
- Rotating breaking-news ticker of 8 real India health facts
- 3 rotating lead stories with tier badges
- 4 real India health statistics (1.4B population, 1:834 doctor ratio, 70% rural gap, 2.4M TB cases)
- Editorial pull-quote with the safety-first philosophy

### Full-stack dashboard (7 views)
1. **Live Queue** — 3D tilt cards with mouse-tracked perspective, gradient avatars, tier-tinted backgrounds, search & 6 filters
2. **New Intake** — form with live preview scoring that recomputes as you type
3. **Analytics** — Recharts dashboards (tier distribution, arrivals vs discharges, wait-by-tier, age-band radar, confidence distribution) with SVG gradient fills
4. **Bed Board** — 5 zones (Resus/Major/Minor/Observation/Paediatric) with live status
5. **Staff Roster** — on/off-duty clinicians with patient-load bars
6. **Audit Trail** — searchable, filterable timeline with gradient connector + colored dots
7. **Settings** — clinician identity, jurisdiction (DPDP/HIPAA/GDPR/PDPA), retention, demo reset

### Patient Detail modal
- Glassmorphic with animated gradient border
- Tier-tinted hero with floating decorative blob
- Vital cards, decision trace, ML inputs, override section
- Sticky footer with "Record decision" always visible
- Clinical notes, break-glass reveal, discharge/transfer

---

## 🛠️ Tech stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York style)
- **Prisma ORM** + **SQLite**
- **Framer Motion** for animations
- **Recharts** for data visualization
- **Zustand** for client state
- **next-themes** for dark/light mode
- **sonner** for toasts

---

## 🚀 Quick start (local)

```bash
# Install dependencies
bun install

# Push the Prisma schema (creates SQLite DB)
bun run db:push

# Run the dev server
bun run dev
```

Open `http://localhost:3000`. The app auto-seeds 20 demo patients, 2 hospitals, beds, and staff on first load.

---

## 🚢 Deploy on Vercel

### Option A: One-click via Vercel dashboard
1. Push this repo to GitHub
2. Visit [vercel.com/new](https://vercel.com/new) and import the repo
3. Vercel auto-detects Next.js — accept defaults
4. Set the environment variable `DATABASE_URL` (see below)
5. Deploy

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel              # link / create project
vercel env add DATABASE_URL production
vercel --prod
```

### ⚠️ SQLite on Vercel — important note
Vercel's serverless functions have an **ephemeral filesystem** — any SQLite writes are lost between cold starts. For a real deployment, swap the datasource in `prisma/schema.prisma` to a managed Postgres (Neon, Supabase, PlanetScale) and update `DATABASE_URL` accordingly:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

For a quick demo deployment where data persistence isn't critical, the bundled SQLite file works — the seed runs on every cold start and repopulates the 20 demo patients.

---

## 📦 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: TriageSetu — safety-first AI triage"
git branch -M main
git remote add origin https://github.com/<your-username>/triagesetu.git
git push -u origin main
```

---

## 📁 Project structure

```
.
├── prisma/
│   └── schema.prisma              # Hospital, Patient, Audit, Bed, Staff, Note, Setting models
├── public/
│   ├── favicon.svg                # TriageSetu stethoscope logo
│   ├── logo.svg                   # TriageSetu logo
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── api/                   # 17 REST route handlers
│   │   ├── globals.css           # Tailwind + newspaper theme + 3D utilities
│   │   ├── layout.tsx             # Fonts (Unifraktur, Playfair, Lora, Geist) + metadata
│   │   └── page.tsx               # Single-page app shell (hero ↔ dashboard)
│   ├── components/
│   │   ├── triage/
│   │   │   ├── hero-landing.tsx   # 3D newspaper hero
│   │   │   ├── sidebar.tsx        # 3D nav rail
│   │   │   ├── header.tsx         # Sticky top bar
│   │   │   ├── live-queue.tsx     # 3D tilt patient card grid
│   │   │   ├── patient-detail.tsx # Modal with sticky override footer
│   │   │   ├── intake-form.tsx    # Form with live preview scoring
│   │   │   ├── audit-trail.tsx    # Gradient timeline
│   │   │   ├── analytics.tsx      # Recharts dashboards
│   │   │   ├── bed-board.tsx      # Zone grids
│   │   │   ├── staff-roster.tsx   # On-duty cards
│   │   │   ├── settings-view.tsx  # Compliance + reset
│   │   │   ├── metric-card.tsx    # 3D tilt stat cards
│   │   │   ├── tier-badge.tsx     # Glass tier pills
│   │   │   └── confidence-meter.tsx
│   │   └── ui/                    # shadcn/ui components
│   └── lib/
│       ├── triage.ts              # Scoring engine (TS port of Python)
│       ├── service.ts             # DB ops + seeding
│       ├── demo-data.ts           # 20 curated patients + 2 hospitals + beds + staff
│       ├── api.ts                 # Typed API client
│       ├── store.ts               # Zustand store
│       └── db.ts                  # Prisma client singleton
├── .env                           # DATABASE_URL
├── vercel.json
├── next.config.ts
└── package.json
```

---

## 🧪 Try the prototype

1. **Live queue** — open the app, browse the 20-patient queue, click any 3D card to see the decision trace + override flow
2. **Surge** — click "3× Surge" in the header; watch borderline cases auto-escalate
3. **Advance clock** — click "Advance → +30 min"; watch the queue rescore against the deterioration window
4. **New intake** — fill the form; the live preview shows the recommendation update as you type
5. **Override** — open any patient, change the tier, write a rationale, click "Record decision"; check the audit trail
6. **Switch hospital** — top-right dropdown; the Rural ED has no patients yet
7. **Analytics** — see tier distribution, wait times, age-band radar

---

## 🔒 Safety & compliance design

- **Safety-first**: rules can only escalate, never downgrade
- **Confidence surfaced explicitly** on every recommendation (high / moderate / low)
- **Clinician override** with required rationale, signed by clinician ID + role
- **Append-only audit trail** — every intake, override, surge toggle, time advance is logged
- **Pseudonymous by default** — patient identifiers are auto-assigned (TS-XXX); raw complaint is masked in bulk exports unless break-glass was exercised
- **Multi-jurisdiction** settings: DPDP (India), HIPAA (US), GDPR (EU), PDPA (Singapore)
- **Configurable retention** (30 / 90 / 180 / 365 days)
- **Consent toggle** at intake

---

## 📝 License

MIT — see [LICENSE](LICENSE).

---

## 🙏 Acknowledgements

Built for the **Accenture Innovation Challenge — Round 2 (PatientTriage.ai track)**. Inspired by the real-world complexities of emergency care in India and the clinicians who serve under enormous pressure every day.
