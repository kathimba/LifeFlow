import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getTaskById, updateTask, deleteTask } from "@/lib/services/tasks";

// GET /api/tasks/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const task = await getTaskById(user.id, id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error("[GET /api/tasks/:id]", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

// PATCH /api/tasks/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(user.id, id, body);
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Task not found") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      if (error.message === "Goal not found") {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }
    }
    console.error("[PATCH /api/tasks/:id]", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

// DELETE /api/tasks/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    await deleteTask(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Task not found") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    console.error("[DELETE /api/tasks/:id]", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}