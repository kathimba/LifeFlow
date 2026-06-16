// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getAuthUser } from "@lib/auth"
import {
  logTaskCompleted,
  logTaskDeleted,
  logTaskUpdated,
} from "@lib/activity-log"

// ----------------------------------------------------------------
// GET /api/tasks/:id
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
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
      include: {
        goal: { select: { id: true, title: true, userId: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...task,
      goal: task.goal?.userId === user.id
        ? { id: task.goal.id, title: task.goal.title }
        : null,
    })
  } catch (error) {
    console.error("[GET /api/tasks/:id]", error)
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// PATCH /api/tasks/:id
// Handles all updates: status changes, priority, re-linking to goals
// Automatically sets completedAt when status moves to DONE
// Body: { title?, description?, status?, priority?, dueDate?, goalId?, recurrenceRule? }
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
    const existing = await prisma.task.findFirst({
      where: { id, userId: user.id },
      select: { goalId: true, status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, status, priority, dueDate, goalId, recurrenceRule } = body

    if (goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: goalId, userId: user.id },
        select: { id: true },
      })

      if (!goal) {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 })
      }
    }

    // Auto-set completedAt when marking done, clear it if un-done
    const completedAt =
      status === "DONE"
        ? new Date()
        : status !== undefined
        ? null
        : undefined

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && {
          dueDate: dueDate ? new Date(dueDate) : null,
        }),
        ...(goalId !== undefined && { goalId }),
        ...(recurrenceRule !== undefined && { recurrenceRule }),
        ...(completedAt !== undefined && { completedAt }),
      },
      include: {
        goal: { select: { id: true, title: true, userId: true } },
      },
    })

    // Recalculate parent goal progress when task status changes
    if (status !== undefined || goalId !== undefined) {
      const goalIds = new Set([existing.goalId, task.goalId].filter(Boolean) as string[])
      for (const id of goalIds) {
        await recalculateGoalProgress(id, user.id)
      }
    }

    if (status === "DONE" && existing.status !== "DONE") {
      logTaskCompleted(user.id, task.id, {
        title: task.title,
        goalId: task.goalId,
      })
    } else {
      logTaskUpdated(user.id, task.id, {
        title: task.title,
        status: task.status,
        goalId: task.goalId,
      })
    }

    return NextResponse.json({
      ...task,
      goal: task.goal?.userId === user.id
        ? { id: task.goal.id, title: task.goal.title }
        : null,
    })
  } catch (error) {
    console.error("[PATCH /api/tasks/:id]", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// DELETE /api/tasks/:id
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
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
      select: { goalId: true, title: true },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    await prisma.task.delete({ where: { id } })

    logTaskDeleted(user.id, id, { title: task.title, goalId: task.goalId })

    if (task.goalId) await recalculateGoalProgress(task.goalId, user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/tasks/:id]", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// HELPER — Recalculate goal progress based on completed tasks
// progress = (done tasks / total tasks) * 100
// ----------------------------------------------------------------
async function recalculateGoalProgress(goalId: string, userId: string) {
  const tasks = await prisma.task.findMany({
    where: { goalId, userId, status: { not: "ARCHIVED" } },
    select: { status: true },
  })

  if (tasks.length === 0) return

  const done = tasks.filter((t) => t.status === "DONE").length
  const progress = Math.round((done / tasks.length) * 100)

  await prisma.goal.updateMany({
    where: { id: goalId, userId },
    data: { progress },
  })
}
