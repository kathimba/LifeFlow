# LifeFlow

A personal productivity platform that combines task management, goal tracking, daily journaling, document storage, and AI-powered insights — all from a single codebase.

## Features

### Core
- **Tasks** — Create, prioritize, and track tasks with due dates and recurrence rules
- **Goals** — Set goals with sub-goals, track progress with automatic roll-up
- **Journal** — Daily entries with mood and energy tracking, streak counter
- **Dashboard** — Quick capture, today's focus, and daily recommendations
- **Documents** — Upload files to Cloudflare R2, link to goals and tasks

### Productivity
- **Reminders** — Task-linked reminders with bell notifications
- **Full-text Search** — PostgreSQL-powered search across all entities (Cmd+K)
- **Preset Tasks** — 10 categories of ready-to-use tasks for inspiration

### AI & Insights
- **Analytics** — Weekly Score, Task Flow, Goal Trends, Peak Productivity Hours
- **Recommendations** — Daily Focus, Next Best Task, Goal Nudges (5 types)
- **Semantic Search** — Local embedding model (all-MiniLM-L6-v2) with pgvector
- **Recurring Engine** — Auto-create next task instance on completion, pattern detection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes (BFF pattern) |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| Auth | Supabase Auth |
| Storage | Cloudflare R2 |
| AI | Python FastAPI + sentence-transformers |

## Architecture

```
Browser → Next.js (UI + API Routes) → Prisma → PostgreSQL
              ↓                            ↓
        Supabase Auth              FastAPI (embeddings)
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16+ with pgvector extension
- Python 3.10+ (for embeddings)
- Cloudflare R2 account (for document storage)
- Supabase account (for auth)

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/lifeflow.git
cd lifeflow

# Install frontend dependencies
cd frontend
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase, database, and R2 credentials

# Push the database schema
npx prisma db push

# Start the embedding service (separate terminal)
cd ../backend
pip install -r requirements.txt
python embedding_service.py &

# Start the development server
cd ../frontend
npm run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Cloudflare R2
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://...
R2_BUCKET_NAME=...

# Embedding Service
EMBEDDING_SERVICE_URL=http://localhost:8000
```

### Running Tests

```bash
cd frontend

# Set up test database
createdb lifeflow_test
DATABASE_URL=postgresql://.../lifeflow_test npx prisma db push

# Run tests
npx vitest run
```

## Project Structure

```
frontend/
├── prisma/              # Database schema and migrations
├── src/
│   ├── app/             # Next.js pages and API routes
│   │   ├── api/         # REST endpoints
│   │   ├── analytics/   # Analytics dashboard
│   │   ├── documents/   # Document management
│   │   ├── goals/       # Goals and sub-goals
│   │   ├── log/         # Daily journal
│   │   ├── reminders/   # Reminder management
│   │   └── tasks/       # Task management
│   ├── components/      # Reusable UI components
│   └── lib/
│       ├── services/    # Business logic layer
│       │   └── __tests__/  # Service tests (68 tests)
│       ├── auth/        # Authentication helpers
│       ├── store.ts     # Client-side data hooks
│       └── preset-tasks.ts  # Preset task library
backend/
└── embedding_service.py # FastAPI embedding server
```

## Roadmap

- [x] Phase 1 — Core MVP (auth, tasks, goals, dashboard, journal, activity logging)
- [x] Phase 2 — Productivity layer (documents, reminders, full-text search, journal polish)
- [x] Phase 3 — AI & insights (analytics, recommendations, semantic search)
- [x] Phase 4 — Goal hierarchy (sub-goals, progress roll-up)
- [ ] Phase 5 — Collaboration (multi-user goals, task assignment, comments)
- [ ] Phase 6 — Mobile & offline (PWA, offline mode, push notifications)
- [ ] Phase 7 — Polish (OCR, mood/productivity correlation, weekly review email, data export, dark mode)
