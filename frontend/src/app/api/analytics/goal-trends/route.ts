import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getGoalTrends } from "@/lib/services/analytics";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const data = await getGoalTrends(user.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/analytics/goal-trends]", error);
    return NextResponse.json(
      { error: "Failed to fetch goal trends" },
      { status: 500 }
    );
  }
}