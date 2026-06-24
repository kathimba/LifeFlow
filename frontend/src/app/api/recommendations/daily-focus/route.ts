import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getDailyFocus } from "@/lib/services/recommendations";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const focus = await getDailyFocus(user.id);
    return NextResponse.json(focus);
  } catch (error) {
    console.error("[GET /api/recommendations/daily-focus]", error);
    return NextResponse.json({ error: "Failed to generate daily focus" }, { status: 500 });
  }
}