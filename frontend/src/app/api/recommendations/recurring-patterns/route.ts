import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { detectRecurringPatterns } from "@/lib/services/recurrence";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const patterns = await detectRecurringPatterns(user.id);
    return NextResponse.json(patterns);
  } catch (error) {
    console.error("[GET /api/recommendations/recurring-patterns]", error);
    return NextResponse.json({ error: "Failed to detect patterns" }, { status: 500 });
  }
}