import { prisma } from "@lib/prisma";

/**
 * Parse a simple recurrence rule and return the next due date.
 * Supports: "daily", "weekly", "biweekly", "monthly",
 * and RRULE format: "FREQ=DAILY;INTERVAL=1"
 */
export function getNextRecurrenceDate(
  currentDueDate: Date,
  rule: string
): Date | null {
  const normalized = rule.trim().toLowerCase();

  // Simple patterns
  if (normalized === "daily") {
    const next = new Date(currentDueDate);
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (normalized === "weekly") {
    const next = new Date(currentDueDate);
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (normalized === "biweekly") {
    const next = new Date(currentDueDate);
    next.setDate(next.getDate() + 14);
    return next;
  }
  if (normalized === "monthly") {
    const next = new Date(currentDueDate);
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  // RRULE format: "FREQ=DAILY;INTERVAL=2"
  const freqMatch = normalized.match(/freq=(daily|weekly|monthly)/);
  const intervalMatch = normalized.match(/interval=(\d+)/);

  if (freqMatch) {
    const freq = freqMatch[1];
    const interval = intervalMatch ? parseInt(intervalMatch[1]) : 1;
    const next = new Date(currentDueDate);

    switch (freq) {
      case "daily":
        next.setDate(next.getDate() + interval);
        return next;
      case "weekly":
        next.setDate(next.getDate() + 7 * interval);
        return next;
      case "monthly":
        next.setMonth(next.getMonth() + interval);
        return next;
    }
  }

  return null;
}

/**
 * When a task is completed and has a recurrenceRule,
 * create the next instance with the updated due date.
 */
export async function createNextRecurringTask(
  userId: string,
  completedTaskId: string
) {
  const task = await prisma.task.findFirst({
    where: { id: completedTaskId, userId },
  });

  if (!task || !task.recurrenceRule || !task.dueDate) return null;

  const nextDueDate = getNextRecurrenceDate(task.dueDate, task.recurrenceRule);
  if (!nextDueDate) return null;

  return prisma.task.create({
    data: {
      userId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      goalId: task.goalId,
      dueDate: nextDueDate,
      recurrenceRule: task.recurrenceRule,
      status: "TODO",
    },
  });
}

/**
 * Analyze activity logs to detect potential recurring tasks.
 * Returns tasks completed at least 3 times with similar titles
 * within the last 60 days.
 */
export async function detectRecurringPatterns(userId: string) {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  // Get completed tasks in the last 60 days
  const completions = await prisma.activityLog.findMany({
    where: {
      userId,
      entityType: "TASK",
      action: "COMPLETED",
      createdAt: { gte: sixtyDaysAgo },
    },
    select: { metadata: true, createdAt: true },
  });

  // Group by title
  const titleMap = new Map<
    string,
    { count: number; goalId: string | null; lastCompleted: Date }
  >();

  for (const log of completions) {
    const meta = log.metadata as Record<string, any> | null;
    const title = meta?.title as string | undefined;
    if (!title) continue;

    const existing = titleMap.get(title);
    if (existing) {
      existing.count++;
      if (log.createdAt > existing.lastCompleted) {
        existing.lastCompleted = log.createdAt;
      }
    } else {
      titleMap.set(title, {
        count: 1,
        goalId: (meta?.goalId as string) ?? null,
        lastCompleted: log.createdAt,
      });
    }
  }

  // Filter: completed at least 3 times
  const patterns: Array<{
    title: string;
    count: number;
    goalId: string | null;
    lastCompleted: Date;
    suggestedRecurrence: string;
  }> = [];

  for (const [title, data] of titleMap) {
    if (data.count >= 3) {
      // Simple heuristic: calculate average interval
      const dates = completions
        .filter((l) => {
          const meta = l.metadata as Record<string, any> | null;
          return meta?.title === title;
        })
        .map((l) => l.createdAt)
        .sort((a, b) => a.getTime() - b.getTime());

      let suggestedRecurrence = "weekly"; // default
      if (dates.length >= 2) {
        const avgInterval =
          (dates[dates.length - 1].getTime() - dates[0].getTime()) /
          (dates.length - 1) /
          (1000 * 60 * 60 * 24);
        if (avgInterval < 2) suggestedRecurrence = "daily";
        else if (avgInterval < 10) suggestedRecurrence = "weekly";
        else if (avgInterval < 20) suggestedRecurrence = "biweekly";
        else suggestedRecurrence = "monthly";
      }

      patterns.push({
        title,
        count: data.count,
        goalId: data.goalId,
        lastCompleted: data.lastCompleted,
        suggestedRecurrence,
      });
    }
  }

  return patterns.sort((a, b) => b.count - a.count).slice(0, 5);
}