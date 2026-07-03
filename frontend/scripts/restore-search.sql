ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE tasks SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'B');
UPDATE goals SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'B');
UPDATE journal_entries SET search_vector = to_tsvector('english', COALESCE(content, ''));
UPDATE documents SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'C');

CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_goals_search ON goals USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_journal_search ON journal_entries USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN (search_vector);