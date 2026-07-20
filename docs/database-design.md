# Database Design

## Principles

- Every row is owned by a user (`user_id` on all tables).
- Tasks optionally link to goals.
- Goals support parent-child hierarchies (max 2 levels).
- All significant actions are logged for future analytics.
- Embeddings are stored alongside source data in the same database.

## Core Tables

### users
- `id` (UUID, PK)
- `email` (unique)
- `name`
- Timestamps

### goals
- `id`, `user_id` (FK)
- `title`, `description`
- `priority_weight` (1=highest, 5=lowest)
- `status` (ACTIVE | PAUSED | COMPLETED)
- `progress` (0-100, computed by application)
- `parent_goal_id` (self-referencing FK for sub-goals)
- `target_date`
- Timestamps

### tasks
- `id`, `user_id` (FK), `goal_id` (FK, nullable)
- `title`, `description`
- `status` (TODO | IN_PROGRESS | DONE | ARCHIVED)
- `priority` (1=urgent, 5=low)
- `due_date`
- `recurrence_rule` (daily, weekly, biweekly, monthly)
- `completed_at`
- Timestamps

### journal_entries
- `id`, `user_id` (FK)
- `content`
- `mood` (1-5)
- `energy` (1-5)
- Timestamps

### documents
- `id`, `user_id` (FK), `goal_id` (FK, nullable), `task_id` (FK, nullable)
- `title`, `description`
- `file_name`, `file_type`, `file_size`
- `storage_key` (path in R2 bucket)
- `extracted_text` (populated from PDF content)
- Timestamps

### activity_logs
- `id`, `user_id` (FK)
- `entity_type` (TASK | GOAL | JOURNAL | DOCUMENT)
- `entity_id`
- `action` (CREATED | UPDATED | COMPLETED | DELETED)
- `metadata` (JSON)
- Timestamps

### reminders
- `id`, `user_id` (FK), `task_id` (FK)
- `remind_at`
- `message`
- `status` (PENDING | SENT | DISMISSED)
- Timestamps

### embeddings
- `id`, `user_id` (FK)
- `entity_type`, `entity_id`
- `embedding` (vector(384) — pgvector)
- Timestamps

## Entity Relationships
User ──┬── Goal ──┬── Task
│ ├── Document
│ └── Goal (self-reference: sub-goals)
├── JournalEntry
├── ActivityLog
├── Reminder
└── Embedding


Tasks and Documents can optionally link to Goals. Deleting a Goal sets its tasks'
`goal_id` to null (preserves the tasks). Deleting a parent goal promotes its sub-goals
to top-level.