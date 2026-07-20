# LifeFlow Architecture

## Overview

LifeFlow is a personal productivity platform combining task management, goal tracking,
daily journaling, document storage, and AI-powered insights — all from a single codebase.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes (BFF pattern) |
| Database | PostgreSQL (via Supabase) + pgvector |
| ORM | Prisma |
| Auth | Supabase Auth |
| Storage | Cloudflare R2 |
| AI Embeddings | Python FastAPI microservice (all-MiniLM-L6-v2) |

## Architecture Pattern
Browser → Next.js (UI + API Routes) → Prisma → PostgreSQL
↓ ↓
Supabase Auth FastAPI (embeddings only)

The FastAPI service is a single-purpose embedding worker — it does not write to the database
or handle any business logic. All CRUD flows through Next.js route handlers → service layer → Prisma.

## Key Design Decisions

- **No separate backend**: Next.js API routes serve as the backend, keeping the project in one
  repo and one deployment target.
- **Service layer**: All business logic lives in `src/lib/services/`. Route handlers are thin
  wrappers that handle auth, validation, and HTTP responses.
- **pgvector**: Semantic search runs on the same PostgreSQL instance — no external vector database.
- **Local embeddings**: The embedding model runs on your machine via FastAPI. No API keys or
  external costs.

## Directory Structure (simplified)
frontend/
├── prisma/ # Schema & migrations
├── src/
│ ├── app/ # Next.js pages & API routes
│ ├── components/ # UI components
│ └── lib/
│ ├── services/ # Business logic
│ ├── auth/ # Supabase helpers
│ └── store.ts # Client-side data hooks
backend/
└── embedding_service.py # FastAPI embedding server