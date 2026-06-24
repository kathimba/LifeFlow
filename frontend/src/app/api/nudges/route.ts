import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getGoalNudges } from "@/lib/services/nudges";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const nudges = await getGoalNudges(user.id);
    return NextResponse.json(nudges);
  } catch (error) {
    console.error("[GET /api/nudges]", error);
    return NextResponse.json({ error: "Failed to fetch nudges" }, { status: 500 });
  }
}