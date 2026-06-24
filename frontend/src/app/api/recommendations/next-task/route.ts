import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getNextBestTasks } from "@/lib/services/recommendations";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const topN = parseInt(searchParams.get("n") || "3");
    const tasks = await getNextBestTasks(user.id, topN);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[GET /api/recommendations/next-task]", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}