 # LifeFlow Roadmap

**Last updated:** July 1, 2026

---

## Phase 0 – Foundation ✅ Complete

| Task | Status |
|------|--------|
| Repository setup (Next.js, Prisma, Supabase) | ✅ |
| Project structure and conventions | ✅ |
| Documentation scaffold (roadmap, architecture, decisions) | ✅ |
| Environment setup (.env, Docker Compose for Postgres) | ✅ |
| Prisma schema — users, goals, tasks, journal, activity logs | ✅ |
| Database migrations | ✅ |

---

## Phase 1 – Core MVP ✅ Complete

| Task | Status |
|------|--------|
| Supabase Auth (email/password) | ✅ |
| Auth middleware (`getAuthUser`) | ✅ |
| Prisma user sync on first API hit | ✅ |
| Goals CRUD — API routes + UI | ✅ |
| Tasks CRUD — API routes + UI | ✅ |
| Dashboard — quick capture + task toggle wired to API | ✅ |
| Journal CRUD — API routes + log page UI | ✅ |
| Activity logging via `after()` + synchronous fallback | ✅ |
| Goal progress recalc on task status change | ✅ |
| Lovable compatibility layer removed | ✅ |
| Service layer extracted (tasks, goals, journal) | ✅ |
| Architecture docs aligned with reality | ✅ |

---

## Phase 2 – Productivity ✅ Complete

### 2.1 Documents
| Task | Status |
|------|--------|
| Cloudflare R2 bucket setup + API token | ✅ |
| Prisma Document model | ✅ |
| Upload API route (`/api/documents`) | ✅ |
| Document list + metadata update API | ✅ |
| Presigned download URLs | ✅ |
| Document UI — drag & drop, preview, description/caption | ✅ |
| Link documents to goals and tasks | ✅ |
| Delete from R2 + Postgres | ✅ |

### 2.2 Journal Polish
| Task | Status |
|------|--------|
| Energy selector (5 levels) | ✅ |
| Streak counter (consecutive days) | ✅ |
| Inline edit on past entries | ✅ |
| Delete past entries | ✅ |
| Mood/energy saved immediately on selection | ✅ |
| Server-set dates (PostgreSQL `now()`) | ✅ |

### 2.3 Search
| Task | Status |
|------|--------|
| PostgreSQL full-text indexes + triggers on all 4 tables | ✅ |
| Search service with ranking (`ts_rank`) | ✅ |
| Search API (`GET /api/search?q=...&types=...&limit=...`) | ✅ |
| Cmd+K command palette UI | ✅ |
| Type icons + labels (task/goal/journal/document) | ✅ |
| Debounced search | ✅ |

### 2.4 Reminders
| Task | Status |
|------|--------|
| Prisma Reminder model + ReminderStatus enum | ✅ |
| Reminders service (CRUD + dismiss + due detection) | ✅ |
| API routes (`/api/reminders`, `/[id]`, `/[id]/dismiss`) | ✅ |
| Client hook (`useReminders`) with store sync | ✅ |
| Bell icon with due-count badge in header | ✅ |
| Dropdown popover with upcoming reminders | ✅ |
| Reminders page — create, list, dismiss, delete | ✅ |
| Task-linked reminders with custom message | ✅ |

### 2.5 Testing
| Task | Status |
|------|--------|
| Tasks service tests | ✅ 14 |
| Goals service tests | ✅ 4 |
| Journal service tests | ✅ 15 |
| Documents service tests | ✅ 19 |
| Search service tests | ✅ 9 |
| Reminders service tests | ✅ 7 |
| **Total tests** | **68** |

---

## Phase 3 – AI & Insights ✅ Complete

### 3.1 Productivity Analytics
| Task | Status |
|------|--------|
| Weekly review endpoint (`GET /api/analytics/weekly`) | ✅ |
| Tasks completed count (week) | ✅ |
| Most productive day of week | ✅ |
| Top goal (by completed tasks) | ✅ |
| Stale goal detection | ✅ |
| Smart recommendation (rule-based) | ✅ |
| Average mood/energy for the week | ✅ |
| Weekly Score card (0-100) with trend arrow | ✅ |
| Focus %, Days Active, Journal Days breakdown | ✅ |
| Task Flow chart (Created vs Completed, execution ratio) | ✅ |
| Peak Productivity Hours bar chart | ✅ |
| Goal Progress Trends line chart | ✅ |
| Dedicated Analytics page (`/analytics`) | ✅ |

### 3.2 Smart Recommendations
| Task | Status |
|------|--------|
| "Next best task" scoring algorithm (priority, due date, goal, age, staleness) | ✅ |
| Recommended Next Task banner on Tasks page | ✅ |
| Daily Focus card on Dashboard (day-of-week patterns) | ✅ |
| Goal Insights card (5 nudge types) | ✅ |
| Stale goal detection nudges (7/14/30 day severity) | ✅ |
| Missing next action detection | ✅ |
| Goal deadline risk | ✅ |
| Goal momentum (positive reinforcement) | ✅ |
| Priority misalignment detection | ✅ |
| Recurring task engine (RRULE + auto-create next instance) | ✅ |
| Recurring pattern detection from activity logs | ✅ |
| Recurrence selector in TaskModal (daily/weekly/biweekly/monthly) | ✅ |

### 3.3 Semantic Search & Embeddings
| Task | Status |
|------|--------|
| Enable `pgvector` extension on PostgreSQL | ✅ |
| Embedding model in Prisma schema (Unsupported vector(384)) | ✅ |
| Local embedding model — all-MiniLM-L6-v2 via FastAPI | ✅ |
| Embedding client (`src/lib/embedding.ts`) | ✅ |
| Auto-embed journal entries on create/update | ✅ |
| Auto-embed tasks on create/update | ✅ |
| Auto-embed goals on create/update | ✅ |
| Auto-embed documents on create/update | ✅ |
| Backfill scripts for existing data | ✅ |
| Semantic search API (`?mode=semantic`) | ✅ |
| Hybrid search (full-text + semantic merged) | ✅ |
| Cmd+K palette uses hybrid search by default | ✅ |
| AI badge on strong semantic matches (>0.5 similarity) | ✅ |
| Embedding cleanup on entity delete | ✅ |

---

## Phase 4 – Goal Hierarchy ✅ Complete

| Task | Status |
|------|--------|
| Parent goal selector in create dialog | ✅ |
| Sub-goals displayed under parent goals | ✅ |
| Interactive sub-goal cards (link tasks, toggle, unlink) | ✅ |
| Quick-add sub-goal button on each goal | ✅ |
| Task modal shows all goals + sub-goals in dropdown | ✅ |
| Recursive progress roll-up (tasks + sub-goals → parent) | ✅ |
| Fire-and-forget recalculation (no UI lag) | ✅ |
| Max 2 levels enforced | ✅ |

---

## Phase 5 – Collaboration (Future) 🌐

| Task | Priority |
|------|----------|
| Multi-user goals (shared with teammates) | P4 |
| Task assignment to users | P4 |
| Comments/mentions on tasks and goals | P4 |
| Activity feed for shared projects | P4 |

---

## Phase 6 – Mobile & Offline (Future) 📱

| Task | Priority |
|------|----------|
| PWA support (offline caching, install prompt) | P4 |
| Mobile-optimized UI audit and polish | P4 |
| Offline task creation with sync queue | P4 |
| Push notifications for reminders | P4 |

---

## Phase 7 – Remaining Polish (Optional)

| Task | Priority |
|------|----------|
| Similar journal entry suggestions ("You might also like...") | P3 |
| Document text extraction (populate `extracted_text` for PDFs/images) | P3 |
| Mood ↔ productivity correlation chart | P3 |
| Weekly review email summary | P4 |
| Data export (JSON/CSV) | P4 |
| Dark mode toggle | P4 |

---

## Architecture Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-07 | Next.js + FastAPI split planned | Separate concerns for future AI workloads |
| 2026-06-15 | Next.js BFF + Prisma full-stack | Faster MVP, single codebase, type-safe |
| 2026-06-16 | FastAPI deferred to Phase 3 AI microservice | No Python workloads yet |
| 2026-06-16 | Lovable compatibility layer removed | DB shape flows end-to-end |
| 2026-06-16 | Cloudflare R2 for document storage | Zero egress fees, 10 GB free |
| 2026-06-17 | PostgreSQL full-text search | No external service needed |
| 2026-06-17 | Journal dates server-set (PostgreSQL `now()`) | No client-side faking |
| 2026-06-19 | Local embedding model (all-MiniLM-L6-v2) | Free, private, runs on existing hardware |
| 2026-06-19 | pgvector for vector storage | Same Postgres instance, no new infrastructure |
| 2026-06-23 | Goal hierarchy with recursive progress | Task + sub-goal progress rolls up to parent |
| 2026-06-23 | Fire-and-forget progress recalculation | No UI lag on task creation |

---

## Current State Summary

| Layer | Components | Tests |
|-------|-----------|-------|
| **Core** | Auth, Tasks, Goals, Journal, Dashboard | — |
| **Productivity** | Documents (R2), Reminders, Full-text Search | 68 |
| **AI** | Analytics, Recommendations, Semantic Search, Embeddings | — |
| **UX** | Cmd+K Palette, Quick Capture, Goal Hierarchy, Streaks | — |
| **Infrastructure** | PostgreSQL + pgvector, FastAPI (embeddings), Prisma, Supabase | — |