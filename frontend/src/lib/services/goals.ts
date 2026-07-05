import { upsertEmbedding, deleteEmbedding } from "./embeddings";
import { prisma } from "@lib/prisma";
import {
  logGoalCreated,
  logGoalCompleted,
  logGoalUpdated,
  logGoalDeleted,
} from "@lib/activity-log";
import type { GoalStatus } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GoalCreateInput = {
  title: string;
  description?: string | null;
  priorityWeight?: number;
  targetDate?: string | null;
  parentGoalId?: string | null;
};

export type GoalUpdateInput = {
  title?: string;
  description?: string | null;
  status?: GoalStatus;
  priorityWeight?: number;
  progress?: number;
  targetDate?: string | null;
};

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getGoals(
  userId: string,
  filters?: { status?: string }
) {
  return prisma.goal.findMany({
    where: {
      userId,
      parentGoalId: null, // Only top-level goals
      ...(filters?.status && {
        status: filters.status.toUpperCase() as GoalStatus,
      }),
    },
    include: {
      subGoals: {
        where: { userId },
        include: {
          tasks: {
            where: { userId },
            orderBy: { priority: "asc" },
          },
        },
      },
      tasks: {
        where: { userId },
        orderBy: { priority: "asc" },
      },
    },
    orderBy: [{ priorityWeight: "asc" }, { createdAt: "desc" }],
  });
}

export async function getGoalById(userId: string, goalId: string) {
  return prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      subGoals: { where: { userId } },
      tasks: {
        where: { userId },
        orderBy: { priority: "asc" },
      },
    },
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createGoal(userId: string, input: GoalCreateInput) {
  // Validate parent goal if provided
  if (input.parentGoalId) {
    const parent = await prisma.goal.findFirst({
      where: { id: input.parentGoalId, userId },
      select: { id: true },
    });
    if (!parent) throw new Error("Parent goal not found");
  }

  const goal = await prisma.goal.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      priorityWeight: input.priorityWeight ?? 3,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      parentGoalId: input.parentGoalId ?? null,
    },
  });

  logGoalCreated(userId, goal.id, {
    title: goal.title,
    parentGoalId: goal.parentGoalId,
    priorityWeight: goal.priorityWeight,
  });

  const goalText = [goal.title, goal.description].filter(Boolean).join(" ");
  upsertEmbedding(userId, "GOAL", goal.id, goalText).catch(console.error);

  return goal;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  input: GoalUpdateInput
) {
  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true, status: true },
  });

  if (!existing) throw new Error("Goal not found");

  const goal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priorityWeight !== undefined && { priorityWeight: input.priorityWeight }),
      ...(input.progress !== undefined && { progress: input.progress }),
      ...(input.targetDate !== undefined && {
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
      }),
    },
  });

  if (input.status === "COMPLETED" && existing.status !== "COMPLETED") {
    logGoalCompleted(userId, goal.id, {
      title: goal.title,
      progress: goal.progress,
    });
  } else {
    logGoalUpdated(userId, goal.id, {
      title: goal.title,
      status: goal.status,
      progress: goal.progress,
    });
  }

  if (input.title !== undefined || input.description !== undefined) {
    const updatedGoal = await prisma.goal.findUnique({ where: { id: goalId }, select: { title: true, description: true } });
    const text = [updatedGoal?.title, updatedGoal?.description].filter(Boolean).join(" ");
    upsertEmbedding(userId, "GOAL", goalId, text).catch(console.error);
  }

  return goal;
}

export async function deleteGoal(userId: string, goalId: string) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true, title: true },
  });

  if (!goal) throw new Error("Goal not found");

  // Prisma handles SetNull on tasks via schema (onDelete: SetNull)
  await prisma.goal.delete({ where: { id: goalId } });

  deleteEmbedding(userId, "GOAL", goalId).catch(console.error);

  logGoalDeleted(userId, goalId, { title: goal.title });

  return { success: true };
}



/**
 * Recursively recalculate progress for a goal based on its tasks AND sub-goals.
 * Then update all ancestors up the tree.
 */
export async function recalculateGoalProgressRecursive(goalId: string, userId: string) {
  // Fetch the goal with its tasks and immediate sub-goals
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    include: {
      tasks: { where: { userId, status: { not: "ARCHIVED" } } },
      subGoals: { where: { userId } },
    },
  });
  if (!goal) return;

  // ----- tasks contribution -----
  const totalTasks = goal.tasks.length;
  const doneTasks = goal.tasks.filter(t => t.status === "DONE").length;
  let taskProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // ----- sub-goal contribution -----
  let subGoalProgressSum = 0;
  if (goal.subGoals.length > 0) {
    // First ensure each sub-goal's progress is up‑to‑date (recursive)
    for (const sub of goal.subGoals) {
      await recalculateGoalProgressRecursive(sub.id, userId);
    }
    // Re‑fetch sub‑goals to get their updated progress
    const updatedSubs = await prisma.goal.findMany({
      where: { id: { in: goal.subGoals.map(s => s.id) }, userId },
      select: { progress: true },
    });
    subGoalProgressSum = updatedSubs.reduce((sum, s) => sum + s.progress, 0);
  }

  // Combined progress: average of (task progress) and (average sub-goal progress)
  let combinedProgress = taskProgress; // default if no sub-goals
  if (goal.subGoals.length > 0) {
    const avgSubGoalProgress = Math.round(subGoalProgressSum / goal.subGoals.length);
    if (totalTasks > 0) {
      combinedProgress = Math.round((taskProgress + avgSubGoalProgress) / 2);
    } else {
      combinedProgress = avgSubGoalProgress;
    }
  }

  // Update the goal's progress field
  await prisma.goal.updateMany({
    where: { id: goalId, userId },
    data: { progress: combinedProgress },
  });

  // If this goal has a parent, recalculate it as well (walk up)
  if (goal.parentGoalId) {
    await recalculateGoalProgressRecursive(goal.parentGoalId, userId);
  }
}