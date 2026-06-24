import { prisma } from "@lib/prisma";
import { embedText } from "@/lib/embedding";
import { EntityType } from "@prisma/client";
import { search as fullTextSearch, type SearchResult, type SearchEntityType } from "./search";

// ─── CRUD ──────────────────────────────────────────────────────────────────

export async function upsertEmbedding(
  userId: string,
  entityType: EntityType,
  entityId: string,
  text: string
) {
  if (!text?.trim()) return;

  const vector = await embedText(text);
  const vectorStr = `[${vector.join(",")}]`;

  await prisma.$executeRaw`
    DELETE FROM embeddings
    WHERE user_id = ${userId}::uuid
      AND entity_type = ${entityType}::entity_type
      AND entity_id = ${entityId}::uuid
  `;

  await prisma.$executeRaw`
    INSERT INTO embeddings (id, user_id, entity_type, entity_id, embedding, created_at)
    VALUES (gen_random_uuid(), ${userId}::uuid, ${entityType}::entity_type, ${entityId}::uuid, ${vectorStr}::vector(384), NOW())
  `;
}

export async function deleteEmbedding(
  userId: string,
  entityType: EntityType,
  entityId: string
) {
  await prisma.$executeRaw`
    DELETE FROM embeddings
    WHERE user_id = ${userId}::uuid
      AND entity_type = ${entityType}::entity_type
      AND entity_id = ${entityId}::uuid
  `;
}

// ─── Semantic Search ───────────────────────────────────────────────────────

export async function semanticSearch(
  userId: string,
  query: string,
  limit = 10,
  entityTypes?: EntityType[]
) {
  const queryVector = await embedText(query);
  const vectorStr = `[${queryVector.join(",")}]`;

  const typeFilter = entityTypes && entityTypes.length > 0
    ? `AND e.entity_type IN (${entityTypes.map(t => `'${t}'::entity_type`).join(",")})`
    : "";

  const rows = await prisma.$queryRawUnsafe<Array<{
    entity_type: EntityType;
    entity_id: string;
    similarity: number;
  }>>(`
    SELECT
      e.entity_type,
      e.entity_id,
      1 - (e.embedding <=> $1::vector) AS similarity
    FROM embeddings e
    WHERE e.user_id = $2::uuid
      ${typeFilter}
    ORDER BY e.embedding <=> $1::vector
    LIMIT $3
  `, vectorStr, userId, limit);

  return rows.map(r => ({
    entityType: r.entity_type,
    entityId: r.entity_id,
    similarity: Number(r.similarity),
  }));
}

// ─── Hybrid Search ─────────────────────────────────────────────────────────

export type HybridSearchResult = SearchResult & {
  semanticScore?: number;
  hybridScore: number;
};

export async function hybridSearch(
  userId: string,
  query: string,
  limit = 10,
  types?: SearchEntityType[]
): Promise<HybridSearchResult[]> {
  // Run both searches in parallel
  const entityTypes = types?.map(t => t.toUpperCase() as EntityType);

  const [fullTextResults, semanticResults] = await Promise.all([
    fullTextSearch(userId, query, { types, limit: 20 }),
    semanticSearch(userId, query, 20, entityTypes),
  ]);

  // Enrich semantic results with entity details
  const enrichedSemantic = await enrichSemanticResults(userId, semanticResults);

  // Merge: entity key -> combined data
  const resultMap = new Map<string, HybridSearchResult>();

  // Add full-text results
  fullTextResults.forEach((ft) => {
    const key = `${ft.type}-${ft.id}`;
    resultMap.set(key, {
      ...ft,
      hybridScore: ft.rank * 0.6,
    });
  });

  // Merge semantic results
  enrichedSemantic.forEach((sem, idx) => {
    const key = `${sem.type}-${sem.id}`;
    const existing = resultMap.get(key);

    if (existing) {
      existing.semanticScore = sem.semanticScore;
      existing.hybridScore += 30;
      existing.hybridScore += sem.semanticScore * 10;
    } else {
      resultMap.set(key, {
        ...sem,
        type: sem.type as SearchResult["type"],
        hybridScore: sem.semanticScore * 15,
      });
    }
  });

  return Array.from(resultMap.values())
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, limit);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function enrichSemanticResults(
  userId: string,
  results: Awaited<ReturnType<typeof semanticSearch>>
) {
  const enriched: Array<{
    id: string;
    type: string;
    title: string;
    snippet: string;
    url: string;
    rank: number;
    metadata?: Record<string, any>;
    semanticScore: number;
  }> = [];

  for (const r of results) {
    let title = "";
    let snippet = "";
    let url = "";
    let metadata: Record<string, any> | undefined;

    switch (r.entityType) {
      case "TASK": {
        const task = await prisma.task.findFirst({
          where: { id: r.entityId, userId },
          select: { title: true, description: true, priority: true, status: true },
        });
        if (!task) continue;
        title = task.title;
        snippet = task.description?.slice(0, 200) || "";
        url = "/tasks";
        metadata = { priority: task.priority, status: task.status };
        break;
      }
      case "GOAL": {
        const goal = await prisma.goal.findFirst({
          where: { id: r.entityId, userId },
          select: { title: true, description: true, progress: true },
        });
        if (!goal) continue;
        title = goal.title;
        snippet = goal.description?.slice(0, 200) || "";
        url = "/goals";
        metadata = { progress: goal.progress };
        break;
      }
      case "JOURNAL": {
        const entry = await prisma.journalEntry.findFirst({
          where: { id: r.entityId, userId },
          select: { content: true, mood: true, createdAt: true },
        });
        if (!entry) continue;
        title = entry.content.slice(0, 80) + (entry.content.length > 80 ? "..." : "");
        snippet = entry.content.slice(0, 200);
        url = "/log";
        metadata = { mood: entry.mood, date: entry.createdAt.toISOString().slice(0, 10) };
        break;
      }
      case "DOCUMENT": {
        const doc = await prisma.document.findFirst({
          where: { id: r.entityId, userId },
          select: { title: true, description: true, fileType: true },
        });
        if (!doc) continue;
        title = doc.title;
        snippet = doc.description?.slice(0, 200) || "";
        url = "/documents";
        metadata = { fileType: doc.fileType };
        break;
      }
    }

    enriched.push({
      id: r.entityId,
      type: r.entityType.toLowerCase() as SearchEntityType,
      title,
      snippet,
      url,
      rank: r.similarity,
      metadata,
      semanticScore: r.similarity,
    });
  }

  return enriched;
}