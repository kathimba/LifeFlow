// src/app/api/goals/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getAuthUser } from "@lib/auth"
import { logGoalCreated } from "@lib/activity-log"
import { GoalStatus } from "@prisma/client"

// ----------------------------------------------------------------
// GET /api/goals
// Returns all goals for a user, with nested sub-goals and tasks
// Query params: ?status=active|paused|completed
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")

  try {
    const goals = await prisma.goal.findMany({
      where: {
        userId: user.id,
        // Only return top-level goals (sub-goals are nested inside)
        parentGoalId: null,
        ...(status && { status: status.toUpperCase() as GoalStatus }),
      },
      include: {
        // Nest sub-goals one level deep
        subGoals: {
          where: { userId: user.id },
          include: {
            tasks: {
              where: { userId: user.id },
              orderBy: { priority: "asc" },
            },
          },
        },
        // Tasks directly on this goal
        tasks: {
          where: { userId: user.id },
          orderBy: { priority: "asc" },
        },
      },
      orderBy: [
        { priorityWeight: "asc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error("[GET /api/goals]", error)
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// POST /api/goals
// Creates a new goal
// Body: { title, description?, priorityWeight?, targetDate?, parentGoalId? }
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, description, priorityWeight, targetDate, parentGoalId } = body

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      )
    }

    if (parentGoalId) {
      const parentGoal = await prisma.goal.findFirst({
        where: { id: parentGoalId, userId: user.id },
        select: { id: true },
      })

      if (!parentGoal) {
        return NextResponse.json({ error: "Parent goal not found" }, { status: 404 })
      }
    }

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title,
        description: description ?? null,
        priorityWeight: priorityWeight ?? 3,
        targetDate: targetDate ? new Date(targetDate) : null,
        parentGoalId: parentGoalId ?? null,
      },
    })

    logGoalCreated(user.id, goal.id, {
      title: goal.title,
      parentGoalId: goal.parentGoalId,
      priorityWeight: goal.priorityWeight,
    })

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error("[POST /api/goals]", error)
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    )
  }
}
