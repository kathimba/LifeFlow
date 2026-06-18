import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getGoalById, updateGoal, deleteGoal } from "@/lib/services/goals";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { id } = await params;
    const goal = await getGoalById(user.id, id);
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    return NextResponse.json(goal);
  } catch (error) {
    console.error("[GET /api/goals/:id]", error);
    return NextResponse.json({ error: "Failed to fetch goal" }, { status: 500 });
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
    const goal = await updateGoal(user.id, id, body);
    return NextResponse.json(goal);
  } catch (error) {
    if (error instanceof Error && error.message === "Goal not found") {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    console.error("[PATCH /api/goals/:id]", error);
    return NextResponse.json({ error: "Failed to update goal" }, { status: 500 });
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
    await deleteGoal(user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Goal not found") {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    console.error("[DELETE /api/goals/:id]", error);
    return NextResponse.json({ error: "Failed to delete goal" }, { status: 500 });
  }
}