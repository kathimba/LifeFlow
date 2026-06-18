import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getGoals, createGoal } from "@/lib/services/goals";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const goals = await getGoals(user.id, {
      status: searchParams.get("status") || undefined,
    });
    return NextResponse.json(goals);
  } catch (error) {
    console.error("[GET /api/goals]", error);
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
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
    const goal = await createGoal(user.id, body);
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Parent goal not found") {
      return NextResponse.json({ error: "Parent goal not found" }, { status: 404 });
    }
    console.error("[POST /api/goals]", error);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}