import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getTasks, createTask } from "@/lib/services/tasks";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const tasks = await getTasks(user.id, {
      goalId: searchParams.get("goalId") || undefined,
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") ? parseInt(searchParams.get("priority")!) : undefined,
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    const task = await createTask(user.id, body);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Goal not found") {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    console.error("[POST /api/tasks]", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}