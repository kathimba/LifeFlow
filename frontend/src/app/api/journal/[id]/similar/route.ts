import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { prisma } from "@lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;

  try {
    // Get the embedding for this entry
    const embedding = await prisma.$queryRawUnsafe<Array<{ embedding: string }>>(
      `SELECT embedding::text FROM embeddings WHERE entity_type = 'JOURNAL' AND entity_id = $1::uuid AND user_id = $2::uuid`,
      id, user.id
    );

    if (embedding.length === 0) {
      return NextResponse.json([]);
    }

    // Find similar entries
    const similar = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      mood: number | null;
      created_at: Date;
      similarity: number;
    }>>(
      `SELECT
        je.id,
        je.content,
        je.mood,
        je.created_at,
        1 - (e.embedding <=> $1::vector) AS similarity
      FROM embeddings e
      JOIN journal_entries je ON je.id = e.entity_id
      WHERE e.entity_type = 'JOURNAL'
        AND e.user_id = $2::uuid
        AND e.entity_id != $3::uuid
      ORDER BY e.embedding <=> $1::vector
      LIMIT 3`,
      embedding[0].embedding, user.id, id
    );

    return NextResponse.json(
      similar.map((s) => ({
        id: s.id,
        content: s.content.slice(0, 120) + (s.content.length > 120 ? "..." : ""),
        mood: s.mood,
        createdAt: s.created_at.toISOString(),
        similarity: Number(s.similarity),
      }))
    );
  } catch (error) {
    console.error("[GET /api/journal/:id/similar]", error);
    return NextResponse.json({ error: "Failed to fetch similar entries" }, { status: 500 });
  }
}