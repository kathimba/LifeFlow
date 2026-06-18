import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getEntryById, updateEntry, deleteEntry } from "@/lib/services/journal";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const entry = await getEntryById(user.id, id);
    if (!entry) {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }
    return NextResponse.json(entry);
  } catch (error) {
    console.error("[GET /api/journal/:id]", error);
    return NextResponse.json({ error: "Failed to fetch journal entry" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const entry = await updateEntry(user.id, id, body);
    return NextResponse.json(entry);
  } catch (error) {
    if (error instanceof Error && error.message === "Journal entry not found") {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }
    console.error("[PATCH /api/journal/:id]", error);
    return NextResponse.json({ error: "Failed to update journal entry" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    await deleteEntry(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Journal entry not found") {
      return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
    }
    console.error("[DELETE /api/journal/:id]", error);
    return NextResponse.json({ error: "Failed to delete journal entry" }, { status: 500 });
  }
}