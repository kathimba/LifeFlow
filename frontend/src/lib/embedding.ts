import { prisma } from "@lib/prisma";
import { EntityType } from "@prisma/client";

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://localhost:8000";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await fetch(`${EMBEDDING_SERVICE_URL}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) throw new Error(`Embedding service error: ${res.status}`);
  const data = await res.json();
  return data.embeddings;
}

export async function embedText(text: string): Promise<number[]> {
  const embeddings = await embedTexts([text]);
  return embeddings[0];
}

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