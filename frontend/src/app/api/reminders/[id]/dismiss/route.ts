import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { dismissReminder } from "@/lib/services/reminders";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const reminder = await dismissReminder(user.id, id);
    return NextResponse.json(reminder);
  } catch (error) {
    if (error instanceof Error && error.message === "Reminder not found") {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }
    console.error("[POST /api/reminders/:id/dismiss]", error);
    return NextResponse.json({ error: "Failed to dismiss reminder" }, { status: 500 });
  }
}