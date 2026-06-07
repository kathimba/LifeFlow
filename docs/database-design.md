# LifeFlow Database Design

## Design Principles

1. User owns all data.
2. Tasks can optionally belong to goals.
3. Every action is logged.
4. AI features consume activity history.

---

# users

Purpose:
Store account information.

Fields:

- id (UUID, PK)
- email
- password_hash
- full_name
- created_at
- updated_at

---

# goals

Purpose:
Store user goals.

Fields:

- id (UUID, PK)
- user_id (FK)
- title
- description
- priority_weight
- status
- target_date
- created_at
- updated_at

Status:

- ACTIVE
- COMPLETED
- ARCHIVED

---

# tasks

Purpose:
Store user tasks.

Fields:

- id (UUID, PK)
- user_id (FK)
- goal_id (FK, nullable)
- title
- description
- priority
- status
- due_date
- created_at
- completed_at

Priority:

- P1
- P2
- P3
- P4

Status:

- TODO
- IN_PROGRESS
- DONE

---

# activity_logs

Purpose:
Capture user behaviour.

Fields:

- id (UUID, PK)
- user_id (FK)
- action_type
- entity_type
- entity_id
- metadata (JSONB)
- created_at

Examples:

task_created
task_completed
goal_created
goal_updated

---

# Future Tables

## journal_entries

Fields:

- id
- user_id
- content
- mood
- created_at

---

## documents

Fields:

- id
- user_id
- file_url
- title
- uploaded_at

---

## reminders

Fields:

- id
- user_id
- task_id
- trigger_time
- recurrence_rule

---

## embeddings

Purpose:
AI memory system.

Fields:

- id
- entity_type
- entity_id
- embedding_vector

Technology:
pgvector