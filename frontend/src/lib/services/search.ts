import { prisma } from "@lib/prisma";


export type SearchEntityType = "task" | "goal" | "journal" | "document";

export type SearchResult = {
  id: string;
  type: SearchEntityType;
  title: string;
  snippet: string;
  url: string;
  metadata?: Record<string, any>;
  rank: number;
  semanticScore?: number; 
};

export type SearchOptions = {
  types?: SearchEntityType[];
  limit?: number;
};

/**
 * Full-text search across tasks, goals, journal entries, and documents.
 * Uses PostgreSQL tsvector/tsquery with ranking.
 */
export async function search(
  userId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { types, limit = 20 } = options;

  // Sanitize query for tsquery
  const sanitized = query
    .trim()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}:*`)
    .join(" & ");

  if (!sanitized) return [];

  const results: SearchResult[] = [];
  const searchTypes = types || ["task", "goal", "journal", "document"];

  for (const type of searchTypes) {
    const rows = await searchByType(userId, type, sanitized, limit);
    results.push(...rows);
  }

  // Sort by rank descending, then limit
  return results
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

async function searchByType(
  userId: string,
  type: SearchEntityType,
  tsquery: string,
  limit: number
): Promise<SearchResult[]> {
  switch (type) {
    case "task":
      return searchTasks(userId, tsquery, limit);
    case "goal":
      return searchGoals(userId, tsquery, limit);
    case "journal":
      return searchJournal(userId, tsquery, limit);
    case "document":
      return searchDocuments(userId, tsquery, limit);
  }
}

async function searchTasks(
  userId: string,
  tsquery: string,
  limit: number
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: number;
    rank: number;
  }>>`
    SELECT
      id,
      title,
      description,
      status::text,
      priority,
      ts_rank(search_vector, to_tsquery('english', ${tsquery})) AS rank
    FROM tasks
    WHERE user_id = ${userId}::uuid
      AND search_vector @@ to_tsquery('english', ${tsquery})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    type: "task" as const,
    title: row.title,
    snippet: row.description?.slice(0, 200) || "",
    url: "/tasks",
    metadata: {
      status: row.status,
      priority: row.priority,
    },
    rank: Number(row.rank),
  }));
}

async function searchGoals(
  userId: string,
  tsquery: string,
  limit: number
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    description: string | null;
    progress: number;
    status: string;
    rank: number;
  }>>`
    SELECT
      id,
      title,
      description,
      progress,
      status::text,
      ts_rank(search_vector, to_tsquery('english', ${tsquery})) AS rank
    FROM goals
    WHERE user_id = ${userId}::uuid
      AND search_vector @@ to_tsquery('english', ${tsquery})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    type: "goal" as const,
    title: row.title,
    snippet: row.description?.slice(0, 200) || "",
    url: "/goals",
    metadata: {
      progress: row.progress,
      status: row.status,
    },
    rank: Number(row.rank),
  }));
}

async function searchJournal(
  userId: string,
  tsquery: string,
  limit: number
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    content: string;
    mood: number | null;
    created_at: Date;
    rank: number;
  }>>`
    SELECT
      id,
      content,
      mood,
      created_at,
      ts_rank(search_vector, to_tsquery('english', ${tsquery})) AS rank
    FROM journal_entries
    WHERE user_id = ${userId}::uuid
      AND search_vector @@ to_tsquery('english', ${tsquery})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    type: "journal" as const,
    title: row.content.slice(0, 80) + (row.content.length > 80 ? "..." : ""),
    snippet: row.content.slice(0, 200),
    url: "/log",
    metadata: {
      mood: row.mood,
      date: row.created_at.toISOString().slice(0, 10),
    },
    rank: Number(row.rank),
  }));
}

async function searchDocuments(
  userId: string,
  tsquery: string,
  limit: number
): Promise<SearchResult[]> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    description: string | null;
    file_type: string;
    file_size: number;
    rank: number;
  }>>`
    SELECT
      id,
      title,
      description,
      file_type,
      file_size,
      ts_rank(search_vector, to_tsquery('english', ${tsquery})) AS rank
    FROM documents
    WHERE user_id = ${userId}::uuid
      AND search_vector @@ to_tsquery('english', ${tsquery})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    type: "document" as const,
    title: row.title,
    snippet: row.description?.slice(0, 200) || "",
    url: "/documents",
    metadata: {
      fileType: row.file_type,
      fileSize: row.file_size,
    },
    rank: Number(row.rank),
  }));
}