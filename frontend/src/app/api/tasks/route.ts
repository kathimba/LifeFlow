// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getAuthUser } from "@lib/auth"
import { logTaskCreated } from "@lib/activity-log"
import { TaskStatus } from "@prisma/client"

// ----------------------------------------------------------------
// GET /api/tasks
// Returns tasks for a user, filterable by goal/status/priority
// Query params: ?goalId=<uuid>&status=todo&priority=1
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const goalId = searchParams.get("goalId")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")

  try {
    if (goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId: user.id },
        select: { id: true },
      })

      if (!goal) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 })
      }
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        ...(goalId && { goalId }),
        ...(status && { status: status.toUpperCase() as TaskStatus }),
        ...(priority && { priority: parseInt(priority) }),
      },
      include: {
        // Include parent goal title for display in task lists
        goal: {
          select: { id: true, title: true, priorityWeight: true, userId: true },
        },
      },
      orderBy: [
        { priority: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json(
      tasks.map((task) => ({
        ...task,
        goal: task.goal?.userId === user.id
          ? {
              id: task.goal.id,
              title: task.goal.title,
              priorityWeight: task.goal.priorityWeight,
            }
          : null,
      }))
    )
  } catch (error) {
    console.error("[GET /api/tasks]", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// POST /api/tasks
// Creates a new task, optionally linked to a goal
// Body: { title, description?, goalId?, priority?, dueDate?, recurrenceRule? }
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, description, goalId, priority, dueDate, recurrenceRule } = body

    if (!title) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      )
    }

    if (goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId: user.id },
        select: { id: true },
      })

      if (!goal) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 })
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title,
        description: description ?? null,
        goalId: goalId ?? null,
        priority: priority ?? 3,
        dueDate: dueDate ? new Date(dueDate) : null,
        recurrenceRule: recurrenceRule ?? null,
      },
      include: {
        goal: {
          select: { id: true, title: true, userId: true },
        },
      },
    })

    logTaskCreated(user.id, task.id, {
      title: task.title,
      goalId: task.goalId,
      priority: task.priority,
    })

    return NextResponse.json(
      {
        ...task,
        goal: task.goal?.userId === user.id
          ? { id: task.goal.id, title: task.goal.title }
          : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/tasks]", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}
