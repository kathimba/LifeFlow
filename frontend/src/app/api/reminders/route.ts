import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getReminders, createReminder, getDueReminders } from "@/lib/services/reminders";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const due = searchParams.get("due");
    
    if (due === "true") {
      const reminders = await getDueReminders(user.id);
      return NextResponse.json(reminders);
    }

    const reminders = await getReminders(user.id, {
      status: searchParams.get("status") as any || undefined,
      taskId: searchParams.get("taskId") || undefined,
    });
    return NextResponse.json(reminders);
  } catch (error) {
    console.error("[GET /api/reminders]", error);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    const { taskId, remindAt, message } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }
    if (!remindAt) {
      return NextResponse.json({ error: "remindAt is required" }, { status: 400 });
    }

    const reminder = await createReminder(user.id, { taskId, remindAt, message });
    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    console.error("[POST /api/reminders]", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}