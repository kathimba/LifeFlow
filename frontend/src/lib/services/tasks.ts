import { prisma } from "@lib/prisma";
import { logTaskCreated, logTaskCompleted, logTaskUpdated, logTaskDeleted } from "@lib/activity-log";
import type { Prisma, TaskStatus } from "@prisma/client";
import { upsertEmbedding, deleteEmbedding } from "./embeddings";
import { recalculateGoalProgressRecursive } from "./goals";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TaskCreateInput = {
  title: string;
  description?: string | null;
  priority?: number;
  dueDate?: string | null;
  goalId?: string | null;
  recurrenceRule?: string | null;
};

export type TaskUpdateInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: number;
  dueDate?: string | null;
  goalId?: string | null;
  recurrenceRule?: string | null;
};

// ─── Queries ────────────────────────────────────────────────────────────────

const taskInclude = {
  goal: {
    select: { id: true, title: true, priorityWeight: true, userId: true },
  },
} as const;

function formatTaskResponse(task: any, userId: string) {
  return {
    ...task,
    goal: task.goal?.userId === userId
      ? {
          id: task.goal.id,
          title: task.goal.title,
          priorityWeight: task.goal.priorityWeight,
        }
      : null,
  };
}

export async function getTasks(
  userId: string,
  filters?: {
    goalId?: string;
    status?: string;
    priority?: number;
  }
) {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      ...(filters?.goalId && { goalId: filters.goalId }),
      ...(filters?.status && { status: filters.status.toUpperCase() as TaskStatus }),
      ...(filters?.priority !== undefined && { priority: filters.priority }),
    },
    include: taskInclude,
    orderBy: [
      { priority: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  return tasks.map((t) => formatTaskResponse(t, userId));
}

export async function getTaskById(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: taskInclude,
  });

  if (!task) return null;
  return formatTaskResponse(task, userId);
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createTask(userId: string, input: TaskCreateInput) {
  // Validate goal ownership if goalId provided
  if (input.goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: input.goalId, userId },
      select: { id: true },
    });
    if (!goal) throw new Error("Goal not found");
  }

  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      goalId: input.goalId ?? null,
      priority: input.priority ?? 3,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      recurrenceRule: input.recurrenceRule ?? null,
    },
    include: taskInclude,
  });

  // Activity log
  logTaskCreated(userId, task.id, {
    title: task.title,
    goalId: task.goalId,
    priority: task.priority,
  });

  // Recalculate goal progress
  if (task.goalId) {
    recalculateGoalProgress(task.goalId, userId).catch(console.error);
  }

  const taskText = [task.title, task.description].filter(Boolean).join(" ");
  upsertEmbedding(userId, "TASK", task.id, taskText).catch(console.error);

  return formatTaskResponse(task, userId);
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: TaskUpdateInput
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { goalId: true, status: true },
  });

  if (!existing) throw new Error("Task not found");

  // Validate new goal if provided
  if (input.goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: input.goalId, userId },
      select: { id: true },
    });
    if (!goal) throw new Error("Goal not found");
  }

  // Auto-set completedAt
  const completedAt =
    input.status === "DONE"
      ? new Date()
      : input.status !== undefined
        ? null
        : undefined;

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueDate !== undefined && {
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      }),
      ...(input.goalId !== undefined && { goalId: input.goalId }),
      ...(input.recurrenceRule !== undefined && { recurrenceRule: input.recurrenceRule }),
      ...(completedAt !== undefined && { completedAt }),
    },
    include: taskInclude,
  });

  // Recalculate goal progress for both old and new goal
  if (input.status !== undefined || input.goalId !== undefined) {
    const goalIds = new Set(
      [existing.goalId, task.goalId].filter(Boolean) as string[]
    );
    for (const id of goalIds) {
      recalculateGoalProgress(id, userId).catch(console.error);
    }
  }

  // Activity log
  if (input.status === "DONE" && existing.status !== "DONE") {
    logTaskCompleted(userId, task.id, {
      title: task.title,
      goalId: task.goalId,
    });

    // Auto-create next recurring task instance
    if (task.recurrenceRule) {
      const { createNextRecurringTask } = await import("./recurrence");
      await createNextRecurringTask(userId, taskId);
    }
  } else {
    logTaskUpdated(userId, task.id, {
      title: task.title,
      status: task.status,
      goalId: task.goalId,
    });
  }

  if (input.title !== undefined || input.description !== undefined) {
    const updatedTask = await prisma.task.findUnique({ where: { id: taskId }, select: { title: true, description: true } });
    const text = [updatedTask?.title, updatedTask?.description].filter(Boolean).join(" ");
    upsertEmbedding(userId, "TASK", taskId, text).catch(console.error);
  }

  return formatTaskResponse(task, userId);
}

export async function deleteTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { goalId: true, title: true },
  });

  if (!task) throw new Error("Task not found");

  await prisma.task.delete({ where: { id: taskId } });

  deleteEmbedding(userId, "TASK", taskId).catch(console.error);

  logTaskDeleted(userId, taskId, {
    title: task.title,
    goalId: task.goalId,
  });

  if (task.goalId) {
    recalculateGoalProgress(task.goalId, userId).catch(console.error);
  }

  return { success: true };
}

// ─── Shared helper ──────────────────────────────────────────────────────────
// Delegate to the recursive version in goals service
export async function recalculateGoalProgress(goalId: string, userId: string) {
  await recalculateGoalProgressRecursive(goalId, userId);
}