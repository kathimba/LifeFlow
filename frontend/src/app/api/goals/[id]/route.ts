// src/app/api/goals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getAuthUser } from "@lib/auth"
import {
  logGoalCompleted,
  logGoalDeleted,
  logGoalUpdated,
} from "@lib/activity-log"

// ----------------------------------------------------------------
// GET /api/goals/:id
// Returns a single goal with its tasks and sub-goals
// ----------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  try {
    const goal = await prisma.goal.findFirst({
      where: { id, userId: user.id },
      include: {
        subGoals: { where: { userId: user.id } },
        tasks: {
          where: { userId: user.id },
          orderBy: { priority: "asc" },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    return NextResponse.json(goal)
  } catch (error) {
    console.error("[GET /api/goals/:id]", error)
    return NextResponse.json(
      { error: "Failed to fetch goal" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// PATCH /api/goals/:id
// Partial update — any field can be updated independently
// Body: { title?, description?, status?, priorityWeight?, progress?, targetDate? }
// ----------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  try {
    const existing = await prisma.goal.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, status, priorityWeight, progress, targetDate } = body

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priorityWeight !== undefined && { priorityWeight }),
        ...(progress !== undefined && { progress }),
        ...(targetDate !== undefined && {
          targetDate: targetDate ? new Date(targetDate) : null,
        }),
      },
    })

    if (status === "COMPLETED" && existing.status !== "COMPLETED") {
      logGoalCompleted(user.id, goal.id, {
        title: goal.title,
        progress: goal.progress,
      })
    } else {
      logGoalUpdated(user.id, goal.id, {
        title: goal.title,
        status: goal.status,
        progress: goal.progress,
      })
    }

    return NextResponse.json(goal)
  } catch (error) {
    console.error("[PATCH /api/goals/:id]", error)
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// DELETE /api/goals/:id
// Deletes a goal — tasks are set to null (goalId) via SetNull
// ----------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params
  try {
    const existing = await prisma.goal.findFirst({
      where: { id, userId: user.id },
      select: { id: true, title: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 })
    }

    await prisma.goal.delete({
      where: { id },
    })

    logGoalDeleted(user.id, id, { title: existing.title })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[DELETE /api/goals/:id]", error)
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    )
  }
}
