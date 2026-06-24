import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { search, type SearchEntityType } from "@/lib/services/search";
import { hybridSearch } from "@/lib/services/embeddings";
import { EntityType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const typesParam = searchParams.get("types");
  const limitParam = searchParams.get("limit");
  const mode = searchParams.get("mode") || "hybrid"; // "hybrid" | "fulltext" | "semantic"

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const limit = limitParam ? parseInt(limitParam) : 20;

  try {
    // Hybrid (default)
    if (mode === "hybrid") {
      const types = typesParam
        ? (typesParam.split(",") as SearchEntityType[])
        : undefined;
      const results = await hybridSearch(user.id, q.trim(), limit, types);
      return NextResponse.json(results);
    }

    // Full-text only
    if (mode === "fulltext") {
      const types = typesParam
        ? (typesParam.split(",") as SearchEntityType[])
        : undefined;
      const results = await search(user.id, q.trim(), { types, limit });
      return NextResponse.json(results);
    }

    // Semantic only
    if (mode === "semantic") {
      const { semanticSearch } = await import("@/lib/services/embeddings");
      const entityTypes = typesParam
        ? (typesParam.split(",").map(t => t.toUpperCase() as EntityType))
        : undefined;
      const results = await semanticSearch(user.id, q.trim(), limit, entityTypes);
      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/search]", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}