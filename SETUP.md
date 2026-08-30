# Quick Setup Guide

## 🚀 Local Development

```bash
# 1. Install dependencies (use bun, npm, or pnpm)
bun install
# or: npm install

# 2. Generate Prisma client & push schema to SQLite (creates db/custom.db)
bun run db:push
# or: npx prisma db push --accept-data-loss

# 3. (Optional) The database is already seeded — but if you want a fresh seed:
#    The app auto-seeds on first load if the DB is empty.
#    Or hit: POST http://localhost:3000/api/demo/reset

# 4. Start the dev server
bun run dev
# or: npm run dev
```

Open **http://localhost:3000** — you'll see the newspaper-style hero landing page.
Click **"Open dashboard"** (top-right) or scroll to the bottom CTA band.

## 📦 Push to GitHub

```bash
git init
git add .
git commit -m "TriageSetu — safety-first AI triage prototype"
git branch -M main
git remote add origin https://github.com/<your-username>/triagesetu.git
git push -u origin main
```

## ☁️ Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Build command: `bun run build` (or `npm run build`)
5. Install command: `bun install` (or `npm install`)
6. Add env var: `DATABASE_URL` = `file:./db/custom.db`
7. Deploy 🚀

> **Note on SQLite + Vercel**: Vercel's serverless filesystem is ephemeral,
> so SQLite writes are not persisted across cold starts. For a real deployment,
> swap to Postgres (Neon, Supabase) by changing `provider = "postgresql"`
> in `prisma/schema.prisma` and updating `DATABASE_URL`.
> The app will auto-seed demo data on every cold start.

## 🧪 What's seeded

The included `db/custom.db` contains:
- **2 hospitals** — District Hospital Mumbai ED (48 beds) + Rural Health Centre Pune (22 beds)
- **20 curated demo patients** — pediatric, geriatric, ambiguous, zero-history, unconscious, pregnant, paediatric, stroke, chest pain, asthma cases
- **65 beds** across 5 zones (Resus/Major/Minor/Observation/Paediatric)
- **16 staff members** across day/evening/night shifts
- **1 audit entry** (the SYSTEM seed event)

Reset to baseline anytime via **Settings → Reset to demo baseline** or `POST /api/demo/reset`.

## 🛠️ Tech stack

- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM + SQLite
- Framer Motion + Recharts
- Zustand + sonner + next-themes

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server on port 3000 |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to SQLite |
| `bun run db:generate` | Regenerate Prisma client |
| `bun run db:reset` | Reset DB (will re-seed on next load) |

## ⚠️ Disclaimer

This is a clinical workflow prototype — **not a diagnostic device or medical advice**.
The scoring engine runs entirely in-process; no external model API calls are made.
