import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { search, type SearchEntityType } from "@/lib/services/search";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const typesParam = searchParams.get("types");
  const limitParam = searchParams.get("limit");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const types = typesParam
    ? (typesParam.split(",") as SearchEntityType[])
    : undefined;

  const limit = limitParam ? parseInt(limitParam) : 20;

  try {
    const results = await search(user.id, q.trim(), { types, limit });
    return NextResponse.json(results);
  } catch (error) {
    console.error("[GET /api/search]", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}