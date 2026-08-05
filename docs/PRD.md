# AI Retrospective — Product Requirements

## Problem

Agile teams run retrospective ceremonies to reflect on a sprint/cycle: what went well, what
should improve, and what to actually do about it. Existing tools (EasyRetro and similar) cover
the basics; this project adds AI assistance aimed specifically at two friction points: turning
raw "to improve" notes into concrete action items, and helping quieter/shyer contributors turn
a rough thought into a well-formed card without feeling exposed.

## MVP Scope

A single ceremony type: a 3-column retrospective board.

### Columns

- **Went Well**
- **To Improve**
- **Action Items**

### Rooms

- A room is created with a UUID id. The room id itself is the invite link
  (`/room/{uuid}`) — no separate invite token, matching EasyRetro's simple link-sharing model.
- No accounts/login. Joining a room asks for a display name; identity persists per browser via
  a device cookie (see [ARCHITECTURE.md](ARCHITECTURE.md#identity)).
- Rooms with no activity for 30 days are automatically deleted (data + cards + reactions).

### Cards

- Add, edit, remove cards in any column.
- Move cards between columns (drag and drop).
- **Hidden by default**: card text is visible only to its author until a room-level "Reveal
  all cards" action is triggered. After reveal, all cards show their text and author name.
- Reactions: a small fixed set of emoji, toggleable per participant per card.

### AI Generation (Action Items column)

A button that reads all "To Improve" cards in the room and produces suggested Action Items
using an LLM (via OpenRouter, free-tier models), following agile-facilitation guidance in the
prompt. Suggestions are inserted as normal, fully editable cards — never read-only — flagged
internally as AI-originated. Responses are generated in the same language the cards were
written in, independent of the viewer's UI language.

### Idea helper (compose assist)

A "Help me phrase this" action on the card composer: a user types a rough, informal thought
into the same textarea they'd use for the card, then rewrites it in place into a clear,
constructive, well-formatted suggestion they can keep editing before submitting. One input, not
a separate side panel — purpose: lower the bar for hesitant/shy contributors to phrase feedback
well without adding a second field to fill in.

### Export

Room content exportable as a **text-only, section-based PDF** (one section per column).
Requires all cards to be revealed first, so export can't leak hidden authorship-blind content.

## Explicitly out of scope for MVP

- User accounts / cross-device identity / SSO.
- Additional ceremony templates (only the 3-column format).
- A 4th "Kudos" column — color tokens are reserved for it, but it's not built in MVP (see
  [ARCHITECTURE.md](ARCHITECTURE.md)).

## Non-functional requirements

- **Accessibility**: WCAG AA color contrast, full keyboard operability (including drag-and-drop
  reordering), screen-reader-friendly live regions for reveal/AI-generation events.
- **i18n**: platform UI text in `en-US` and `pt-BR`. Card content (user-written or
  AI-generated) is never machine-translated — it stays in whatever language it was written in.
- **Cost**: must run entirely on free tiers (hosting, database, AI).
- **Local dev**: a contributor with no prior context should be able to get the app running
  locally by following [RUNBOOK.md](../RUNBOOK.md).
