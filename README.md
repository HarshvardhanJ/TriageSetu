<div align="center">

# 🩺 TriageSetu

### Safety-first AI triage for emergency care

*A hybrid rule + ML scoring engine that helps Emergency Department staff prioritize and route patients — with explicit uncertainty, clinician override, and an unbreakable audit trail.*

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

> ⚠️ **Disclaimer**: This is a clinical workflow prototype — **not a diagnostic device or medical advice**. The scoring engine runs entirely in-process; no external model API calls are made. Built for the **PatientTriage.ai** track of the Accenture Innovation Challenge, Round 2.

---

## 📑 Table of Contents

1. [Overview](#-overview)
2. [Implementation Approach](#-implementation-approach)
3. [Solution Architecture](#-solution-architecture)
4. [Scoring Pipeline](#-scoring-pipeline)
5. [Data Model](#-data-model)
6. [Tech Stack & Dependencies](#-tech-stack--dependencies)
7. [Project Structure](#-project-structure)
8. [Execution Instructions](#-execution-instructions)
9. [Deployment](#-deployment)
10. [Safety & Compliance](#-safety--compliance)
11. [Try the Prototype](#-try-the-prototype)

---

## 🎯 Overview

TriageSetu is a full-stack clinical decision-support prototype that helps emergency department staff prioritize and route patients as they arrive. It combines **transparent rule-based safety nets** with an **explainable ML risk model** to produce recommendations that are always reviewable, overridable, and audit-locked.

### Key principles

| Principle | How it's enforced |
|-----------|-------------------|
| **Safety-first** | Rules can only **escalate**, never downgrade a tier |
| **Explicit uncertainty** | Every recommendation ships with a confidence score (high / moderate / low) |
| **Clinician accountability** | Every override requires a rationale, signed by clinician ID + role |
| **Auditability** | Append-only ledger logs every intake, override, surge toggle, time advance |
| **Pseudonymous by default** | Patient identifiers are auto-assigned (TS-XXX); raw data masked in exports |

---

## 💡 Implementation Approach

The prototype addresses seven real-world complexities from the PatientTriage.ai brief:

### 1. Age-aware normalization
Vital sign thresholds differ across pediatric (<18), adult (18–64), and geriatric (≥65) populations. A fever of 38.5°C carries different urgency in a 3-year-old versus a 75-year-old. The engine **age-bands every vital** before scoring.

### 2. Hybrid rule + ML scoring
Rather than trusting a single black-box model, TriageSetu runs **two scorers in parallel**:

- A **transparent rule engine** — hard safety nets for AVPU, active bleeding, SpO₂ floors, chest symptoms, age-specific thresholds
- An **ML proxy** — calibrated to mirror a trained `HistGradientBoostingClassifier`'s burden formula, ported 1:1 from the original Python prototype to TypeScript

The two tiers are **fused** with `Math.min(ruleTier, mlTier)` — the more conservative (lower) tier always wins.

### 3. Explicit uncertainty fusion
Confidence is not just model probability — it's a composite of:
- **Margin** (distance from threshold boundary)
- **Completeness** (how many vitals are recorded)
- **Agreement** (do rule and ML agree?)
- **History availability** (does the patient have prior records?)

When confidence is low, the rule/ML disagree, or history is missing, the system **escalates one tier** and flags it for clinician review.

### 4. Asymmetric costs of triage error
Under-triage (missing a critical case) is categorically worse than over-triage (over-prioritizing a minor one). The escalation policy reflects this: **uncertainty always pushes toward higher acuity, never lower**.

### 5. Surge protocol
During mass-casualty events or 3× patient volume, clinicians can toggle surge mode. Borderline cases (confidence < 82 or ML tier ≤ 3) automatically escalate one level. The entire queue is **rescored** against the new policy on toggle.

### 6. Deterioration reassessment
Patients waiting beyond their tier's safety window are auto-escalated:

| Tier | Safety window |
|------|---------------|
| ESI 1–2 (Resuscitation/Emergent) | 15 minutes |
| ESI 3 (Urgent) | 30 minutes |
| ESI 4–5 (Less/Non-urgent) | 90 minutes |

The "Advance clock" feature simulates time passing — every patient is rescored against the new wait time.

### 7. Clinical accountability & DPDP compliance
Every recommendation, override, surge toggle, and time advance is written to an **append-only audit ledger** with timestamp, clinician ID, role, and rationale. Patient data is **pseudonymous by default** — bulk exports redact raw complaints unless break-glass was exercised. The Settings page supports DPDP (India), HIPAA (US), GDPR (EU), and PDPA (Singapore) jurisdictions.

---

## 🏗 Solution Architecture

### High-level system architecture

```mermaid
architecture-beta
    group frontend(cloud)[Frontend — Next.js 16]
        group hero(frontend)[3D Newspaper Hero]
        group dashboard(frontend)[Dashboard SPA]
        group components(frontend)[Triage Components]

    group backend(cloud)[Backend — Next.js Route Handlers]
        group api(backend)[REST API]
        group scoring(backend)[Scoring Engine]
        group service(backend)[Service Layer]

    group data(cloud)[Data Layer]
        group db(data)[SQLite + Prisma]
        group seed(data)[Seed Data]

    group browser(cloud)[Browser]

    browser:-[HTTP]->api
    hero:->dashboard
    dashboard:->components
    components:-[fetch]->api
    api:->service
    service:->scoring
    service:->db
    seed:->db
```

### Request flow

```mermaid
flowchart LR
    subgraph Browser["🌐 Browser"]
        HeroLanding["3D Newspaper<br/>Hero Landing"]
        Dashboard["Dashboard SPA<br/>(7 views)"]
    end

    subgraph NextJS["⚡ Next.js 16 App Router"]
        APIRoutes["REST API Routes<br/>/api/queue, /patients,<br/>/surge, /clock, /audit, ..."]
        ServiceLayer["Service Layer<br/>service.ts"]
        ScoringEngine["Scoring Engine<br/>triage.ts"]
    end

    subgraph Data["💾 Data Layer"]
        Prisma["Prisma Client"]
        SQLite[("SQLite<br/>custom.db")]
        SeedData["Seed Data<br/>20 patients, 2 hospitals,<br/>65 beds, 16 staff"]
    end

    HeroLanding -->|"onEnter()"| Dashboard
    Dashboard -->|"fetch()"| APIRoutes
    APIRoutes --> ServiceLayer
    ServiceLayer --> ScoringEngine
    ServiceLayer --> Prisma
    Prisma --> SQLite
    SeedData -->|"auto-seed<br/>on first load"| SQLite

    style Browser fill:#f0f9ff,stroke:#0284c7,color:#000
    style NextJS fill:#faf5ff,stroke:#7c3aed,color:#000
    style Data fill:#f0fdf4,stroke:#16a34a,color:#000
```

### Component architecture

```mermaid
flowchart TD
    subgraph App["src/app/"]
        Layout["layout.tsx<br/>Fonts + ThemeProvider + Toaster"]
        Page["page.tsx<br/>Hero ↔ Dashboard switcher"]
        Globals["globals.css<br/>Newspaper theme + 3D utilities"]
        API["api/<br/>17 route handlers"]
    end

    subgraph Components["src/components/triage/"]
        HeroLanding["hero-landing.tsx<br/>3D broadsheet"]
        Sidebar["sidebar.tsx<br/>3D nav rail"]
        Header["header.tsx<br/>sticky top bar"]
        LiveQueue["live-queue.tsx<br/>3D tilt card grid"]
        PatientDetail["patient-detail.tsx<br/>modal + sticky override"]
        IntakeForm["intake-form.tsx<br/>live preview scoring"]
        Analytics["analytics.tsx<br/>Recharts dashboards"]
        AuditTrail["audit-trail.tsx<br/>gradient timeline"]
        BedBoard["bed-board.tsx<br/>zone grids"]
        StaffRoster["staff-roster.tsx<br/>on-duty cards"]
        SettingsView["settings-view.tsx<br/>compliance + reset"]
        MetricCard["metric-card.tsx<br/>3D tilt stats"]
        TierBadge["tier-badge.tsx<br/>glass pills"]
        ConfidenceMeter["confidence-meter.tsx"]
    end

    subgraph Lib["src/lib/"]
        Triage["triage.ts<br/>Scoring engine (TS port)"]
        Service["service.ts<br/>DB ops + seeding"]
        DemoData["demo-data.ts<br/>20 patients + 2 hospitals"]
        ApiClient["api.ts<br/>typed fetch client"]
        Store["store.ts<br/>Zustand state"]
        Db["db.ts<br/>Prisma singleton"]
    end

    Page --> HeroLanding
    Page --> Sidebar
    Page --> Header
    Page --> LiveQueue
    Page --> PatientDetail
    Page --> IntakeForm
    Page --> Analytics
    Page --> AuditTrail
    Page --> BedBoard
    Page --> StaffRoster
    Page --> SettingsView
    LiveQueue --> MetricCard
    LiveQueue --> TierBadge
    LiveQueue --> ConfidenceMeter
    PatientDetail --> TierBadge
    PatientDetail --> ConfidenceMeter
    IntakeForm --> TierBadge
    Page -.->|"fetch()"| ApiClient
    ApiClient -.-> API
    API --> Service
    Service --> Triage
    Service --> Db
    Service --> DemoData

    style App fill:#fff7ed,stroke:#ea580c,color:#000
    style Components fill:#eff6ff,stroke:#2563eb,color:#000
    style Lib fill:#f0fdf4,stroke:#16a34a,color:#000
```

---

## ⚙️ Scoring Pipeline

The scoring engine is a faithful TypeScript port of the original Python prototype. It runs **synchronously** in the Next.js Route Handler — no external model API calls.

### Full scoring flow

```mermaid
flowchart TD
    Start([" Patient intake "]) --> Parse["Parse Intake fields<br/>(age, vitals, complaint, flags)"]

    Parse --> AgeBand["Compute age band<br/>pediatric < 18 · adult 18-64 · geriatric ≥ 65"]
    Parse --> SymptomFlags["Extract symptom flags<br/>chest · breath · neuro ·<br/>pregnancy · bleed · severe"]

    AgeBand --> Features["Build 15-dim feature vector<br/>age-normalized vital deviations +<br/>binary symptom flags"]
    SymptomFlags --> Features

    Features --> RuleEngine[" Rule Engine<br/>Hard safety nets "]
    Features --> MLProxy[" ML Proxy<br/>Burden-based tier estimation "]

    RuleEngine --> RuleTier{" Rule tier<br/>1-5 "}
    MLProxy --> MLTier{" ML tier<br/>1-5 "}

    RuleTier --> Fuse[" Fuse<br/>tier = min(rule, ML) "]
    MLTier --> Fuse

    Fuse --> Confidence["Compute confidence<br/>f(margin, completeness,<br/>agreement, history)"]

    Confidence --> Uncertain{" Uncertain?<br/>conf < 72 · disagreement ·<br/>no history "}
    Uncertain -->|"Yes"| Escalate[" Escalate +1 tier<br/>Flag: Needs clinician review "]
    Uncertain -->|"No"| Surge

    Escalate --> Surge{" Surge active?<br/>conf < 82 · ML ≤ 3 "}
    Surge -->|"Yes"| SurgeEscalate[" Escalate +1 tier<br/>Flag: 3× surge policy "]
    Surge -->|"No"| Wait

    SurgeEscalate --> Wait{" Wait ≥ safety window? "}
    Wait -->|"Yes"| Overdue[" Escalate +1 tier<br/>Flag: Reassessment overdue "]
    Wait -->|"No"| Finalize

    Overdue --> Finalize[" Final tier +<br/>explanation +<br/>feature contributions "]
    Finalize --> End([" Recommendation "])

    style Start fill:#dcfce7,stroke:#16a34a,color:#000
    style End fill:#dcfce7,stroke:#16a34a,color:#000
    style RuleEngine fill:#fee2e2,stroke:#dc2626,color:#000
    style MLProxy fill:#dbeafe,stroke:#2563eb,color:#000
    style Fuse fill:#fef3c7,stroke:#d97706,color:#000
    style Escalate fill:#ffedd5,stroke:#ea580c,color:#000
    style SurgeEscalate fill:#ffedd5,stroke:#ea580c,color:#000
    style Overdue fill:#ffedd5,stroke:#ea580c,color:#000
    style Finalize fill:#dcfce7,stroke:#16a34a,color:#000
```

### Rule engine decision tree

```mermaid
flowchart TD
    Start([" Vitals + complaint "]) --> AVPU{" AVPU = unresponsive<br/>or pain? "}

    AVPU -->|"Yes"| T1[" Tier 1: Resuscitation<br/>AVPU indicates reduced consciousness "]
    AVPU -->|"No"| Bleed{" Active bleeding<br/>or neuro symptom<br/>or bleed flag? "}

    Bleed -->|"Yes"| T1b[" Tier 1: Resuscitation<br/>Critical red-flag presentation "]
    Bleed -->|"No"| SpO2{" SpO₂ < 90%? "}

    SpO2 -->|"Yes"| T2[" Tier 2: Emergent<br/>SpO₂ below critical floor "]
    SpO2 -->|"No"| Chest{" Chest symptom +<br/>HR > 100 or RR > 20<br/>or SpO₂ < 97? "}

    Chest -->|"Yes"| T3[" Tier 3: Urgent<br/>Chest/oxygenation amber floor "]
    Chest -->|"No"| SpO2b{" SpO₂ < 95%? "}

    SpO2b -->|"Yes"| T3b[" Tier 3: Urgent<br/>Chest/oxygenation amber floor "]
    SpO2b -->|"No"| Age{" Age-specific<br/>vital deviation? "}

    Age -->|"Yes"| T3c[" Tier 3: Urgent<br/>Age-normalized vital deviation "]
    Age -->|"No"| T5[" Tier 5: Non-urgent<br/>No hard safety rule triggered "]

    style T1 fill:#fecaca,stroke:#dc2626,color:#000
    style T1b fill:#fecaca,stroke:#dc2626,color:#000
    style T2 fill:#fed7aa,stroke:#ea580c,color:#000
    style T3 fill:#fef3c7,stroke:#d97706,color:#000
    style T3b fill:#fef3c7,stroke:#d97706,color:#000
    style T3c fill:#fef3c7,stroke:#d97706,color:#000
    style T5 fill:#dcfce7,stroke:#16a34a,color:#000
```

### Confidence computation

```mermaid
flowchart LR
    subgraph Inputs[" Confidence Inputs "]
        Margin[" Margin<br/>distance from threshold "]
        Completeness[" Completeness<br/>7 vitals recorded "]
        Agreement[" Agreement<br/>rule == ML? "]
        History[" History<br/>prior records? "]
    end

    subgraph Formula[" Confidence Formula "]
        Calc[" confidence =<br/>52<br/>+ margin × 42<br/>+ completeness × 8<br/>+ (history ? 8 : 0)<br/>+ (agreement ? 9 : -7) "]
    end

    subgraph Output[" Output "]
        Clamp[" Clamp to [44, 96] "]
        Label{" Label "}
        High[" ≥ 80%: high "]
        Moderate[" 62-79%: moderate "]
        Low[" < 62%: low "]
    end

    Margin --> Calc
    Completeness --> Calc
    Agreement --> Calc
    History --> Calc
    Calc --> Clamp
    Clamp --> Label
    Label --> High
    Label --> Moderate
    Label --> Low

    style Inputs fill:#eff6ff,stroke:#2563eb,color:#000
    style Formula fill:#faf5ff,stroke:#7c3aed,color:#000
    style High fill:#dcfce7,stroke:#16a34a,color:#000
    style Moderate fill:#fef3c7,stroke:#d97706,color:#000
    style Low fill:#fecaca,stroke:#dc2626,color:#000
```

---

## 🗄 Data Model

### Entity-Relationship Diagram

```mermaid
erDiagram
    Hospital ||--o{ Patient : admits
    Hospital ||--o{ Bed : contains
    Hospital ||--o{ Staff : employs
    Patient ||--o{ Audit : generates
    Patient ||--o{ Note : has

    Hospital {
        string id PK
        string code UK
        string name
        string type "urban_trauma | rural_ed | specialty"
        int bedsTotal
        datetime createdAt
    }

    Patient {
        string id PK "TS-XXX pseudonymous"
        string hospitalId FK
        string displayName
        string data "JSON: Intake"
        string score "JSON: Score"
        datetime arrivedAt
        int waitMinutes
        int clinicianTier "nullable"
        string clinicianId "nullable"
        string clinicianRole "nullable"
        string status "waiting | treated | transferred"
        string gender
        boolean revealed "break-glass"
    }

    Audit {
        int id PK
        datetime createdAt
        string eventType "INTAKE | OVERRIDE | SURGE | REASSESS | SYSTEM"
        string patientId FK "nullable"
        string clinicianId "nullable"
        string clinicianRole "nullable"
        string detail "JSON"
    }

    Bed {
        string id PK
        string hospitalId FK
        string code "RES-01, MAJ-02..."
        string zone "resus | major | minor | obs | paediatric"
        string status "free | occupied | cleaning | reserved"
        string patientId "nullable"
    }

    Staff {
        string id PK
        string hospitalId FK
        string name
        string role "triage_nurse | ed_physician | consultant..."
        string shift "day | evening | night"
        boolean onDuty
        int load "patient count"
    }

    Note {
        int id PK
        string patientId FK
        string author
        string role
        string text
        datetime createdAt
    }

    Setting {
        string key PK
        string value "surge_hospitalId | jurisdiction | retention_days"
    }
```

### Seeded demo data

| Entity | Count | Notes |
|--------|-------|-------|
| **Hospitals** | 2 | District Hospital Mumbai ED (48 beds) + Rural Health Centre Pune (22 beds) |
| **Patients** | 20 | Curated: pediatric, geriatric, ambiguous, zero-history, unconscious, pregnant, stroke, chest pain, asthma |
| **Beds** | 65 | Across 5 zones: Resus / Major / Minor / Observation / Paediatric |
| **Staff** | 16 | Across day / evening / night shifts |
| **Audit entries** | 1 | Initial SYSTEM seed event (grows with usage) |

---

## 🧰 Tech Stack & Dependencies

### Stack overview

```mermaid
flowchart TB
    subgraph Frontend[" Frontend "]
        NextJS[" Next.js 16<br/>App Router + RSC "]
        React[" React 19 "]
        TS[" TypeScript 5 "]
        Tailwind[" Tailwind CSS 4 "]
        Shadcn[" shadcn/ui<br/>(New York) "]
        Framer[" Framer Motion 12 "]
        Recharts[" Recharts "]
        Zustand[" Zustand "]
        NextThemes[" next-themes "]
        Sonner[" sonner "]
    end

    subgraph Fonts[" Newspaper Fonts "]
        Unifraktur[" UnifrakturMaguntia<br/>(Blackletter masthead) "]
        Playfair[" Playfair Display<br/>(Didone headlines) "]
        Lora[" Lora<br/>(Old Style body) "]
        Geist[" Geist + Geist Mono "]
    end

    subgraph Backend[" Backend "]
        Routes[" Route Handlers<br/>(17 REST endpoints) "]
        Zod[" Zod<br/>(validation) "]
    end

    subgraph Data[" Data "]
        Prisma[" Prisma ORM 6 "]
        SQLite[" SQLite "]
    end

    subgraph Tooling[" Tooling "]
        ESLint[" ESLint 9 "]
        Bun[" Bun (package manager) "]
    end

    NextJS --> React
    NextJS --> TS
    NextJS --> Tailwind
    NextJS --> Shadcn
    NextJS --> Framer
    NextJS --> Recharts
    NextJS --> Zustand
    NextJS --> NextThemes
    NextJS --> Sonner
    NextJS --> Fonts
    NextJS --> Routes
    Routes --> Zod
    Routes --> Prisma
    Prisma --> SQLite
    NextJS --> Tooling

    style Frontend fill:#eff6ff,stroke:#2563eb,color:#000
    style Fonts fill:#fef3c7,stroke:#d97706,color:#000
    style Backend fill:#faf5ff,stroke:#7c3aed,color:#000
    style Data fill:#f0fdf4,stroke:#16a34a,color:#000
    style Tooling fill:#fff7ed,stroke:#ea580c,color:#000
```

### Production dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | ^16.1.1 | App Router, RSC, Route Handlers |
| `react` / `react-dom` | ^19.0.0 | UI library |
| `typescript` | ^5 | Type safety |
| `tailwindcss` | ^4 | Styling engine |
| `@prisma/client` / `prisma` | ^6.11.1 | ORM + SQLite client |
| `framer-motion` | ^12.23.2 | 3D animations, spring physics |
| `recharts` | ^2.15.4 | Charts (bar, line, radar) |
| `zustand` | ^5.0.6 | Client state (view, hospital, clinician) |
| `next-themes` | ^0.4.6 | Dark / light mode |
| `sonner` | ^2.0.6 | Toast notifications |
| `zod` | ^4.0.2 | API input validation |
| `lucide-react` | ^0.525.0 | Icons |
| `date-fns` | ^4.1.0 | Date formatting |
| `uuid` | ^11.1.0 | ID generation |
| `cmdk` | ^1.1.1 | Command palette primitive |
| `vaul` | ^1.1.2 | Drawer (mobile nav) |
| `@radix-ui/*` | various | Headless UI primitives (16 packages) |

### Full `package.json` scripts

```jsonc
{
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "eslint .",
    "db:push": "prisma db push --accept-data-loss",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "postinstall": "prisma generate"
  }
}
```

---

## 📁 Project Structure

```mermaid
flowchart LR
    Root["TriageSetu/"] --> Prisma["prisma/"]
    Root --> Public["public/"]
    Root --> Src["src/"]
    Root --> Db["db/"]
    Root --> Config["config files"]

    Prisma --> Schema["schema.prisma<br/>7 models"]

    Public --> Favicon["favicon.svg<br/>(stethoscope)"]
    Public --> Logo["logo.svg"]
    Public --> Robots["robots.txt"]

    Src --> App["app/"]
    Src --> Components["components/"]
    Src --> Lib["lib/"]
    Src --> Hooks["hooks/"]

    App --> Layout["layout.tsx<br/>fonts + theme"]
    App --> Page["page.tsx<br/>hero ↔ dashboard"]
    App --> Globals["globals.css<br/>newspaper theme"]
    App --> Api["api/<br/>17 routes"]

    Components --> Ui["ui/<br/>shadcn (50+)"]
    Components --> Triage["triage/<br/>14 components"]

    Lib --> TriageEngine["triage.ts<br/>scoring engine"]
    Lib --> ServiceLib["service.ts<br/>DB ops"]
    Lib --> DemoData["demo-data.ts<br/>20 patients"]
    Lib --> ApiClient["api.ts<br/>typed client"]
    Lib --> Store["store.ts<br/>Zustand"]
    Lib --> DbClient["db.ts<br/>Prisma"]

    Db --> Sqlite["custom.db<br/>(seeded)"]

    Config --> Pkg["package.json"]
    Config --> Vercel["vercel.json"]
    Config --> Next["next.config.ts"]
    Config --> Env[".env"]
    Config --> Readme["README.md"]
    Config --> Setup["SETUP.md"]

    style Root fill:#faf5ff,stroke:#7c3aed,color:#000
    style Prisma fill:#f0fdf4,stroke:#16a34a,color:#000
    style Public fill:#fff7ed,stroke:#ea580c,color:#000
    style Src fill:#eff6ff,stroke:#2563eb,color:#000
    style Db fill:#fef3c7,stroke:#d97706,color:#000
```

### File tree

```
triagesetu/
├── prisma/
│   └── schema.prisma              # 7 models: Hospital, Patient, Audit, Bed, Staff, Note, Setting
├── public/
│   ├── favicon.svg                # TriageSetu stethoscope logo (gradient)
│   ├── logo.svg                   # Animated version
│   └── robots.txt
├── db/
│   └── custom.db                  # Seeded SQLite (20 patients, 2 hospitals, 65 beds, 16 staff)
├── src/
│   ├── app/
│   │   ├── api/                   # 17 REST route handlers
│   │   │   ├── queue/route.ts
│   │   │   ├── patients/route.ts
│   │   │   ├── patients/[id]/route.ts
│   │   │   ├── patients/[id]/override/route.ts
│   │   │   ├── patients/[id]/status/route.ts
│   │   │   ├── surge/route.ts
│   │   │   ├── clock/advance/route.ts
│   │   │   ├── audit/route.ts
│   │   │   ├── metrics/route.ts
│   │   │   ├── hospitals/route.ts
│   │   │   ├── beds/route.ts
│   │   │   ├── staff/route.ts
│   │   │   ├── notes/[patientId]/route.ts
│   │   │   ├── export/route.ts
│   │   │   ├── settings/route.ts
│   │   │   ├── demo/reset/route.ts
│   │   │   └── health/route.ts
│   │   ├── globals.css            # Tailwind 4 + newspaper theme + 3D utilities
│   │   ├── layout.tsx             # 4 Google fonts + ThemeProvider + metadata
│   │   └── page.tsx               # Single-page app: hero ↔ dashboard switcher
│   ├── components/
│   │   ├── ui/                    # shadcn/ui (50+ components)
│   │   └── triage/
│   │       ├── hero-landing.tsx   # 3D newspaper broadsheet (masthead, ticker, 3-column body)
│   │       ├── sidebar.tsx        # 3D nav rail with depth
│   │       ├── header.tsx         # Sticky glass header
│   │       ├── live-queue.tsx     # 3D tilt patient card grid (mouse-tracked)
│   │       ├── patient-detail.tsx# Modal with sticky override footer
│   │       ├── intake-form.tsx    # Form with live preview scoring
│   │       ├── audit-trail.tsx    # Gradient timeline with colored dots
│   │       ├── analytics.tsx      # Recharts: tier dist, arrivals, wait, radar
│   │       ├── bed-board.tsx      # 5 zone grids with hover tilt
│   │       ├── staff-roster.tsx   # On-duty cards with load bars
│   │       ├── settings-view.tsx  # Compliance + clinician identity + reset
│   │       ├── metric-card.tsx    # 3D tilt stat cards
│   │       ├── tier-badge.tsx     # Glass tier pills
│   │       ├── confidence-meter.tsx
│   │       └── theme-provider.tsx
│   ├── lib/
│   │   ├── triage.ts              # Scoring engine (TS port of Python)
│   │   ├── service.ts             # DB operations, seeding, surge/clock/override
│   │   ├── demo-data.ts           # 20 curated patients + 2 hospitals + beds + staff
│   │   ├── api.ts                 # Typed API client for the frontend
│   │   ├── store.ts               # Zustand store (view, hospital, clinician)
│   │   ├── db.ts                  # Prisma client singleton
│   │   └── utils.ts               # cn() class merge
│   └── hooks/
│       ├── use-mobile.ts
│       └── use-toast.ts
├── .env                           # DATABASE_URL=file:./db/custom.db
├── .env.example
├── .gitignore
├── LICENSE                        # MIT
├── README.md                      # This file
├── SETUP.md                       # Quick start guide
├── vercel.json                    # Vercel deployment config
├── next.config.ts                 # standalone output + allowedDevOrigins
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── components.json                # shadcn config
```

---

## 🚀 Execution Instructions

### Prerequisites

| Tool | Version | Required? |
|------|---------|-----------|
| **Node.js** | ≥ 20 | ✅ Required |
| **Bun** | ≥ 1.0 | ⚡ Recommended (faster) |
| **npm / pnpm** | latest | ✅ Alternative to Bun |

### Local development

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/triagesetu.git
cd triagesetu

# 2. Install dependencies (choose one)
bun install                    # ⚡ Recommended
# or: npm install
# or: pnpm install

# 3. Push the Prisma schema (creates db/custom.db if missing)
bun run db:push
# or: npx prisma db push --accept-data-loss

# 4. Start the dev server
bun run dev
# or: npm run dev
```

Open **http://localhost:3000** — you'll land on the 3D newspaper hero.

> 💡 **Auto-seeding**: If `db/custom.db` is empty, the app auto-seeds 20 demo patients, 2 hospitals, 65 beds, and 16 staff on first API call. No manual seed step needed.

### Available scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to SQLite |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:migrate` | Create + apply migration |
| `bun run db:reset` | Reset DB (re-seeds on next load) |

### Reset to baseline

```bash
# Option 1: API call
curl -X POST http://localhost:3000/api/demo/reset

# Option 2: UI — go to Settings → "Reset to demo baseline"
```

---

## ☁️ Deployment

### Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: TriageSetu — safety-first AI triage"
git branch -M main
git remote add origin https://github.com/<your-username>/triagesetu.git
git push -u origin main
```

### Deploy on Vercel

```mermaid
flowchart LR
    GitHub[" GitHub Repo "]
    VercelImport[" Import on<br/>vercel.com/new "]
    Detect[" Auto-detect<br/>Next.js framework "]
    EnvVar[" Set env var:<br/>DATABASE_URL=file:./db/custom.db "]
    Build[" Build:<br/>bun run build "]
    Deploy[" Deploy 🚀 "]
    Live[" Live URL:<br/>triagesetu.vercel.app "]

    GitHub --> VercelImport
    VercelImport --> Detect
    Detect --> EnvVar
    EnvVar --> Build
    Build --> Deploy
    Deploy --> Live

    style GitHub fill:#f0fdf4,stroke:#16a34a,color:#000
    style VercelImport fill:#eff6ff,stroke:#2563eb,color:#000
    style Live fill:#faf5ff,stroke:#7c3aed,color:#000
```

#### Option A: Vercel Dashboard (recommended)
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `bun run build`
5. Install command: `bun install`
6. Add env var: `DATABASE_URL` = `file:./db/custom.db`
7. Deploy 🚀

#### Option B: Vercel CLI
```bash
npm i -g vercel
vercel              # link / create project
vercel env add DATABASE_URL production
vercel --prod
```

### ⚠️ SQLite on Vercel — important note

Vercel's serverless functions have an **ephemeral filesystem** — any SQLite writes are lost between cold starts. The app will **auto-seed on every cold start**, repopulating the 20 demo patients.

For a persistent production deployment, swap to managed Postgres (Neon, Supabase, PlanetScale):

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // ← change from "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
# .env
DATABASE_URL="postgresql://user:password@host:port/dbname?schema=public"
```

---

## 🔒 Safety & Compliance

### Compliance flow

```mermaid
flowchart TD
    Intake([" Patient intake "]) --> Consent{" Consent required?<br/>(configurable) "}
    Consent -->|"Yes"| CollectConsent[" Record consent "]
    Consent -->|"No"| Pseudonymize
    CollectConsent --> Pseudonymize[" Pseudonymize ID<br/>TS-XXX "]

    Pseudonymize --> Score[" Score patient "]
    Score --> Audit[" Append to audit ledger<br/>(timestamp + clinician ID) "]
    Audit --> Override{" Clinician override? "}

    Override -->|"Yes"| RecordOverride[" Record override<br/>(rationale required) "]
    Override -->|"No"| Wait
    RecordOverride --> Wait[" Patient waits "]

    Wait --> Reassess{" Wait > safety window? "}<br/>
    Reassess -->|"Yes"| Escalate[" Auto-escalate tier "]
    Reassess -->|"No"| Treat

    Escalate --> Treat[" Treatment / discharge "]
    Treat --> Retention{" Retention period<br/>elapsed? "}<br/>
    Retention -->|"No"| Keep[" Keep in audit ledger "]
    Retention -->|"Yes"| Anonymize[" Anonymize records "]

    subgraph Jurisdictions[" Supported Jurisdictions "]
        DPDP[" India — DPDP 2023 "]
        HIPAA[" US — HIPAA "]
        GDPR[" EU — GDPR +<br/>national health law "]
        PDPA[" Singapore — PDPA "]
    end

    Jurisdictions -.->|"configurable"| Consent
    Jurisdictions -.->|"configurable"| Retention

    style Intake fill:#dcfce7,stroke:#16a34a,color:#000
    style Audit fill:#eff6ff,stroke:#2563eb,color:#000
    style Escalate fill:#ffedd5,stroke:#ea580c,color:#000
    style Anonymize fill:#fef3c7,stroke:#d97706,color:#000
    style Jurisdictions fill:#faf5ff,stroke:#7c3aed,color:#000
```

### Safety guarantees

| Guarantee | Implementation |
|-----------|----------------|
| Rules can only escalate | `tier = Math.min(ruleTier, mlTier)` — never raises the floor |
| Confidence surfaced | Every recommendation ships with % + label (high/moderate/low) |
| Uncertainty → escalation | Low confidence / disagreement / missing history escalates +1 |
| Surge policy | Toggleable; rescores entire queue |
| Deterioration monitoring | Wait-time safety windows (15/30/90 min) auto-escalate |
| Clinician override | Requires rationale + clinician ID + role; audit-locked |
| Pseudonymous by default | Auto-assigned TS-XXX IDs; raw data masked in bulk exports |
| Break-glass | Records access event to audit trail |
| Multi-jurisdiction | DPDP / HIPAA / GDPR / PDPA settings |
| Configurable retention | 30 / 90 / 180 / 365 days |

---

## 🧪 Try the Prototype

### Quick demo flow

```mermaid
flowchart LR
    A[" 1. Land on<br/>3D newspaper hero "]
    B[" 2. Click<br/>Open dashboard "]
    C[" 3. Browse<br/>20 patients "]
    D[" 4. Click any<br/>3D card "]
    E[" 5. Override tier<br/>+ rationale "]
    F[" 6. Check<br/>audit trail "]
    G[" 7. Toggle<br/>3× surge "]
    H[" 8. Advance<br/>clock 30 min "]
    I[" 9. View<br/>analytics "]
    J[" 10. Reset demo "]

    A --> B --> C --> D --> E --> F --> G --> H --> I --> J

    style A fill:#faf5ff,stroke:#7c3aed,color:#000
    style J fill:#dcfce7,stroke:#16a34a,color:#000
```

### Recommended test scenarios

1. **Live queue** — browse the 20-patient queue, observe tier badges, confidence meters, and deterioration flags
2. **Patient detail** — click any card, review the decision trace (rule vs ML vs fused), see vital cards, add notes
3. **Override flow** — change tier, write rationale, click "Record decision" — verify it appears in the audit trail
4. **Surge protocol** — click "3× Surge" in the header — watch borderline cases auto-escalate
5. **Deterioration** — click "Advance → +30 min" — patients beyond their safety window get escalated
6. **New intake** — fill the form with a chest pain complaint — watch the live preview show ESI 2 instantly
7. **Hospital switch** — top-right dropdown — switch between Mumbai ED and Rural Pune
8. **Analytics** — tier distribution, arrivals vs discharges, wait-by-tier, age-band radar
9. **Bed board** — 5 zones with live status (free / occupied / cleaning / reserved)
10. **Reset** — Settings → "Reset to demo baseline" restores the 20 baseline cases

---

<div align="center">

## 🙏 Acknowledgements

Built for the **Accenture Innovation Challenge — Round 2 (PatientTriage.ai track)**.

Inspired by the real-world complexities of emergency care in India and the clinicians who serve under enormous pressure every day.

---

**License**: [MIT](LICENSE) · **Stack**: Next.js 16 · TypeScript · Tailwind 4 · Prisma · SQLite · Framer Motion · Recharts

</div>
