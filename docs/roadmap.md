# LifeFlow Roadmap

**Last Updated:** June 18, 2026

---

# Phase 0 – Foundation ✅ Complete

| Task | Status |
|---|---|
| Repository setup (Next.js, Prisma, Supabase) | ✅ |
| Project structure and conventions | ✅ |
| Documentation scaffold (roadmap, architecture, decisions) | ✅ |
| Environment setup (.env, Docker Compose for Postgres) | ✅ |
| Prisma schema — users, goals, tasks, journal, activity logs | ✅ |
| Database migrations | ✅ |

---

# Phase 1 – Core MVP ✅ Complete

| Task | Status |
|---|---|
| Supabase Auth (email/password) | ✅ |
| Auth middleware (`getAuthUser`) | ✅ |
| Prisma user sync on first API request | ✅ |
| Goals CRUD — API routes + UI | ✅ |
| Tasks CRUD — API routes + UI | ✅ |
| Dashboard — quick capture + task toggle wired to API | ✅ |
| Journal CRUD — API routes + log page UI | ✅ |
| Activity logging via `after()` + synchronous fallback | ✅ |
| Goal progress recalculation on task status change | ✅ |
| Lovable compatibility layer removed | ✅ |
| Service layer extracted (tasks, goals, journal) | ✅ |
| Architecture documentation aligned with implementation | ✅ |

---

# Phase 2 – Productivity ✅ Complete

## 2.1 Documents

| Task | Status |
|---|---|
| Cloudflare R2 bucket setup + API token | ✅ |
| Prisma Document model | ✅ |
| Upload API route (`/api/documents`) | ✅ |
| Document list + metadata update API | ✅ |
| Presigned download URLs (1 hour expiry) | ✅ |
| Document UI — drag & drop, preview, description/caption | ✅ |
| Link documents to goals and tasks | ✅ |
| Delete from R2 + PostgreSQL | ✅ |

---

## 2.2 Journal Improvements

| Task | Status |
|---|---|
| Energy selector (5 levels) | ✅ |
| Streak counter (consecutive days) | ✅ |
| Inline edit on past entries | ✅ |
| Delete past entries | ✅ |
| Mood/energy saved immediately on selection | ✅ |
| Server-controlled dates (`PostgreSQL now()`) | ✅ |

---

## 2.3 Search

| Task | Status |
|---|---|
| PostgreSQL full-text indexes + triggers on all 4 tables | ✅ |
| Search service with ranking (`ts_rank`) | ✅ |
| Search API (`GET /api/search?q=&types=&limit=`) | ✅ |
| Cmd+K command palette UI | ✅ |
| Type icons + labels (task/goal/journal/document) | ✅ |
| Debounced search (200ms) | ✅ |

---

## 2.4 Reminders

| Task | Status |
|---|---|
| Prisma Reminder model + `ReminderStatus` enum | ✅ |
| Reminder service (CRUD + dismiss + due detection) | ✅ |
| Reminder API routes (`/api/reminders`) | ✅ |
| Client hook (`useReminders`) with store sync | ✅ |
| Notification bell with due-count badge | ✅ |
| Dropdown popover with upcoming reminders | ✅ |
| Reminders page — create, list, dismiss, delete | ✅ |
| Task-linked reminders with custom messages | ✅ |

---

## 2.5 Testing

| Service | Tests |
|---|---|
| Tasks service | ✅ 14 |
| Goals service | ✅ 4 |
| Journal service | ✅ 15 |
| Documents service | ✅ 19 |
| Search service | ✅ 9 |
| Reminders service | ✅ 7 |
| **Total** | **✅ 68 tests** |

---

# Phase 3 – AI & Insights 🧠 Current

## 3.1 Productivity Analytics

| Task | Priority | Status |
|---|---|---|
| Weekly review endpoint (`GET /api/analytics/weekly`) | P1 | 🔄 In Progress |
| Tasks completed count (weekly) | P1 | 🔄 |
| Most productive day of week | P1 | 🔄 |
| Top goal by completed tasks | P1 | 🔄 |
| Stale goal detection | P1 | 🔄 |
| Smart recommendations (rule-based) | P1 | 🔄 |
| Average weekly mood/energy | P2 | Not Started |
| Peak productivity hours | P2 | Not Started |
| Weekly review UI/dashboard card | P2 | Not Started |
| Goal progress trends (line chart) | P3 | Not Started |
| Mood ↔ productivity correlation | P3 | Not Started |

---

# 3.2 Smart Recommendations

| Task | Priority | Status |
|---|---|---|
| "Next best task" scoring algorithm | P2 | Not Started |
| Goal nudges (stale goal alerts) | P2 | Not Started |
| Daily focus suggestion/card | P2 | Not Started |
| Recurring task pattern detection/Priority Scoring Engine | P3 | Not Started |

---

# 3.3 Semantic Search & Embeddings

| Task | Priority | Status |
|---|---|---|
| Enable `pgvector` extension | P3 | Not Started |
| Uncomment Embedding model in Prisma | P3 | Not Started |
| Choose embedding provider (OpenAI/local) | P3 | Not Started |
| Generate embeddings for journal entries | P3 | Not Started |
| Semantic search in Cmd+K palette | P3 | Not Started |
| Similar entry suggestions | P3 | Not Started |
| Document text extraction (`extracted_text`) | P4 | Not Started |

---

# 3.4 FastAPI AI Microservice (Optional)

| Task | Priority | Status |
|---|---|---|
| Decide FastAPI role vs Next.js-only architecture | P3 | Deferred |
| Setup FastAPI AI service | P4 | Not Started |
| Shared PostgreSQL access from FastAPI | P4 | Not Started |

---

# Phase 4 – Collaboration 🌐 Future

| Task | Priority |
|---|---|
| Multi-user shared goals | P4 |
| Task assignment to users | P4 |
| Comments and mentions | P4 |
| Shared activity feed | P4 |

---

# Phase 5 – Mobile & Offline 📱 Future

| Task | Priority |
|---|---|
| PWA support (offline caching/install prompt) | P4 |
| Mobile UI optimisation | P4 |
| Offline task creation with sync queue | P4 |
| Push notifications for reminders | P4 |

---

# Architecture Decision Log

| Date | Decision | Reason |
|---|---|---|
| 2026-06-07 | Planned Next.js + FastAPI split | Separate future AI workloads |
| 2026-06-15 | Adopted Next.js BFF + Prisma full-stack | Faster MVP delivery, single type-safe codebase |
| 2026-06-16 | FastAPI deferred to Phase 3 AI microservice | No Python workloads required yet |
| 2026-06-16 | Removed Lovable compatibility layer | Database flow now works end-to-end |
| 2026-06-16 | Cloudflare R2 for document storage | S3 compatible, low cost, no egress fees |
| 2026-06-17 | PostgreSQL full-text search | Avoid external search dependency |
| 2026-06-17 | Journal dates server-controlled | Prevent client-side date manipulation |
| 2026-06-18 | Phase 3 begins with analytics using `activity_logs` | Existing data already provides AI-ready signals |

---

# Current Milestone

**Completed:**
- Foundation
- Core MVP
- Productivity layer

**Current Focus:**
> Phase 3 — AI & Insights

First objective:
> Turn existing user activity data into actionable productivity intelligence before introducing complex AI infrastructure.