import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@lib/auth";
import { getTaskFlow } from "@/lib/services/analytics";

export async function GET(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const flow = await getTaskFlow(user.id);
    return NextResponse.json(flow);
  } catch (error) {
    console.error("[GET /api/analytics/task-flow]", error);
    return NextResponse.json({ error: "Failed to fetch task flow" }, { status: 500 });
  }
}