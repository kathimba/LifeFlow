# LifeFlow Architecture

## Overview

LifeFlow is an AI-powered personal productivity platform that combines:

- Task Management
- Goal Tracking
- Daily Journaling
- Document Management
- AI Recommendations

The system follows a split architecture:

Frontend (Next.js)
        |
        v
Backend API (FastAPI)
        |
        v
PostgreSQL Database
        |
        v
AI Services Layer

---

## Technology Stack

### Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS
- Zustand
- React Query

### Backend

- FastAPI
- SQLAlchemy
- Alembic

### Database

- PostgreSQL
- pgvector (future AI memory)

### Authentication

- Supabase Auth

### Storage

- Cloudflare R2

### AI Layer

Phase 1:
- No AI

Phase 2:
- Rule-based recommendations

Phase 3:
- Embeddings
- Semantic Search
- Task Recommendations

---

## System Modules

### Authentication

Responsibilities:
- Login
- Registration
- Session Management

### Tasks Module

Responsibilities:
- Create Tasks
- Edit Tasks
- Complete Tasks
- Prioritize Tasks

### Goals Module

Responsibilities:
- Goal Creation
- Goal Tracking
- Goal Progress

### Dashboard Module

Responsibilities:
- Today View
- Active Goals
- Completion Metrics

### Activity Logging

Responsibilities:
- Record all user actions
- Feed future AI systems

---

## Future Modules

### Journaling

- Daily Logs
- Reflections
- Mood Tracking

### Documents

- File Uploads
- Document Linking
- Search

### Recommendations

- Suggested Tasks
- Goal Alignment
- Weekly Insights

---

## Deployment

Frontend:
- Vercel

Backend:
- Render / Fly.io

Database:
- Supabase PostgreSQL

Storage:
- Cloudflare R2