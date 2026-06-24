import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getWeeklyReview } from "@/lib/services/analytics";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const review = await getWeeklyReview(user.id);
    return NextResponse.json(review);
  } catch (error) {
    console.error("[GET /api/analytics/weekly]", error);
    return NextResponse.json(
      { error: "Failed to generate weekly review" },
      { status: 500 }
    );
  }
}