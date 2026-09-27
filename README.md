# AI Retrospective

A collaborative sprint retrospective board — Went Well / To Improve / Action Items — with
anonymous per-room participation, hidden-until-revealed cards, live updates, reactions, PDF
export, and AI assistance for turning feedback into action items (and rough notes into clear
cards). No accounts: joining a room only asks for a display name, and identity is tracked
per-browser via a device cookie.

https://github.com/user-attachments/assets/3bec990b-2b62-466d-b92e-1182b4b5a951

## Features

- **Rooms, no login**: a room is just a UUID (`/room/{uuid}`) — the URL is the invite link.
- **Three-column board**: Went Well / To Improve / Action Items, with drag-and-drop reordering,
  moving between columns, and merging two cards by dropping one onto the center of another.
- **Hidden-until-revealed cards**: card text is visible only to its author until a room-level
  reveal; after that everyone sees text and author.
- **Reactions**: a small fixed set of emoji, toggleable per participant per card.
- **Action item ownership**: any participant can assign/change who owns an Action Item.
- **AI-generated action items**: a button turns the room's "To Improve" cards into suggested,
  fully-editable Action Items via an LLM, in the same language the cards were written in.
- **AI phrasing helper**: "Help me phrase this" rewrites a rough draft into a clear, constructive
  card in place, aimed at lowering the bar for hesitant contributors.
- **PDF export**: text-only, section-per-column export, available only once cards are revealed.
- **Realtime sync**: board changes propagate live to everyone in the room.
- **i18n**: UI in `en-US` and `pt-BR`; card content is never machine-translated.

## Stack

| Concern     | Choice                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| Framework   | Next.js (App Router, Server Components, Server Actions), TypeScript strict |
| Hosting     | Vercel                                                                     |
| Database    | Postgres (Supabase-hosted in production; `supabase/postgres` image locally) |
| Live sync   | Supabase Realtime **Broadcast** (signal-only, not Postgres CDC)           |
| UI kit      | shadcn/ui (Radix) + Tailwind CSS                                           |
| Drag & drop | `@dnd-kit/core` + `@dnd-kit/sortable`                                      |
| AI          | OpenRouter, free-tier chat models                                          |
| PDF export  | `@react-pdf/renderer`, generated server-side                              |
| i18n        | `next-intl` (`en-US`, `pt-BR`) — platform UI text only                    |
| Validation  | Zod                                                                        |

All reads/writes go through Server Actions, which hold the only database credential — the
browser never talks to Postgres directly. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for
the full data-flow and hidden-card authorization model.

## Docs

- **Run it locally**: see [RUNBOOK.md](RUNBOOK.md).
- **Product scope**: see [docs/PRD.md](docs/PRD.md).
- **Architecture & data model**: see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
  [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
- **Security**: see [docs/SECURITY.md](docs/SECURITY.md) (identity/impersonation, prompt
  injection defenses, RLS posture, rate limiting).

## Quick start

```bash
npm install
cp .env.local.example .env.local
docker compose up -d
npm run dev
```

Full details, including deployment, in [RUNBOOK.md](RUNBOOK.md).
