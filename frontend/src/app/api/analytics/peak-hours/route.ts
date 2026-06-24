import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getPeakProductivity } from "@/lib/services/analytics";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const data = await getPeakProductivity(user.id, days);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/analytics/peak-hours]", error);
    return NextResponse.json(
      { error: "Failed to fetch peak hours" },
      { status: 500 }
    );
  }
}