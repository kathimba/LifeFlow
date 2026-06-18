-- Add tsvector columns for full-text search
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate with existing data
UPDATE tasks SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');

UPDATE goals SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');

UPDATE journal_entries SET search_vector = 
  to_tsvector('english', COALESCE(content, ''));

UPDATE documents SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(extracted_text, '')), 'B');

-- Create GIN indexes for fast search
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_goals_search ON goals USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_journal_search ON journal_entries USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN (search_vector);

-- Create trigger functions to keep search_vector updated automatically
CREATE OR REPLACE FUNCTION tasks_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION goals_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION journal_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION documents_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.extracted_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_tasks_search ON tasks;
CREATE TRIGGER trg_tasks_search
  BEFORE INSERT OR UPDATE OF title, description ON tasks
  FOR EACH ROW EXECUTE FUNCTION tasks_search_update();

DROP TRIGGER IF EXISTS trg_goals_search ON goals;
CREATE TRIGGER trg_goals_search
  BEFORE INSERT OR UPDATE OF title, description ON goals
  FOR EACH ROW EXECUTE FUNCTION goals_search_update();

DROP TRIGGER IF EXISTS trg_journal_search ON journal_entries;
CREATE TRIGGER trg_journal_search
  BEFORE INSERT OR UPDATE OF content ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION journal_search_update();

DROP TRIGGER IF EXISTS trg_documents_search ON documents;
CREATE TRIGGER trg_documents_search
  BEFORE INSERT OR UPDATE OF title, description, extracted_text ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_update();