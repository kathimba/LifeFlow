import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getEntries, createEntry } from "@/lib/services/journal";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit");
    const entries = await getEntries(user.id, {
      ...(limit ? { limit: parseInt(limit) } : {}),
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("[GET /api/journal]", error);
    return NextResponse.json({ error: "Failed to fetch journal entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { content, mood, energy } = body;

    if (!content?.trim() && !mood && !energy) {
      return NextResponse.json(
        { error: "At least one of content, mood, or energy is required" },
        { status: 400 }
      );
    }

    const entry = await createEntry(user.id, body);
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("[POST /api/journal]", error);
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}