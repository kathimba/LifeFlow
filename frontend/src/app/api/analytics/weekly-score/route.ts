import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getWeeklyScore } from "@/lib/services/analytics";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const score = await getWeeklyScore(user.id);
    return NextResponse.json(score);
  } catch (error) {
    console.error("[GET /api/analytics/weekly-score]", error);
    return NextResponse.json({ error: "Failed to fetch weekly score" }, { status: 500 });
  }
}