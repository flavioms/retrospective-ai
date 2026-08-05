# AI Retrospective

A collaborative sprint retrospective board — Went Well / To Improve / Action Items — with
anonymous per-room participation, hidden-until-revealed cards, live updates, reactions, PDF
export, and AI assistance for turning feedback into action items (and rough notes into clear
cards).

- **Run it locally**: see [RUNBOOK.md](RUNBOOK.md).
- **Product scope**: see [docs/PRD.md](docs/PRD.md).
- **Architecture & data model**: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
  [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Stack

Next.js (App Router, Server Actions) · Postgres (Supabase) · Supabase Realtime (broadcast) ·
shadcn/ui + Tailwind · dnd-kit · OpenRouter · next-intl · Vercel.

## Quick start

```bash
npm install
cp .env.local.example .env.local
docker compose up -d
npm run dev
```

Full details, including deployment, in [RUNBOOK.md](RUNBOOK.md).
