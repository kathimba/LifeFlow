import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import {
  getReminderById,
  updateReminder,
  deleteReminder,
  dismissReminder,
} from "@/lib/services/reminders";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const reminder = await getReminderById(user.id, id);
    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }
    return NextResponse.json(reminder);
  } catch (error) {
    console.error("[GET /api/reminders/:id]", error);
    return NextResponse.json({ error: "Failed to fetch reminder" }, { status: 500 });
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
    const reminder = await updateReminder(user.id, id, body);
    return NextResponse.json(reminder);
  } catch (error) {
    if (error instanceof Error && error.message === "Reminder not found") {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }
    console.error("[PATCH /api/reminders/:id]", error);
    return NextResponse.json({ error: "Failed to update reminder" }, { status: 500 });
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
    await deleteReminder(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Reminder not found") {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }
    console.error("[DELETE /api/reminders/:id]", error);
    return NextResponse.json({ error: "Failed to delete reminder" }, { status: 500 });
  }
}