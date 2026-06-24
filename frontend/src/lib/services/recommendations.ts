import { prisma } from "@lib/prisma";
import type { Task, Goal } from "@prisma/client";

type ScoredTask = {
  task: Task & { goal?: Goal | null };
  score: number;
  breakdown: {
    priority: number;
    dueUrgency: number;
    goalImportance: number;
    age: number;
    staleGoalBonus: number;
  };
};

/**
 * Returns the top N recommended tasks for a user, sorted by score descending.
 */
export async function getNextBestTasks(
  userId: string,
  topN = 3
): Promise<ScoredTask[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Fetch all open tasks with their goal
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ["TODO", "IN_PROGRESS"] },
    },
    include: {
      goal: true,
    },
  });

  if (tasks.length === 0) return [];

  // Get stale goals: active goals with no completed tasks in 14 days
  const activeGoals = await prisma.goal.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true },
  });

  const staleGoalIds = new Set<string>();
  for (const goal of activeGoals) {
    const recentCompletion = await prisma.activityLog.findFirst({
      where: {
        userId,
        entityType: "TASK",
        action: "COMPLETED",
        createdAt: { gte: fourteenDaysAgo },
        metadata: { path: ["goalId"], equals: goal.id },
      },
    });
    if (!recentCompletion) {
      staleGoalIds.add(goal.id);
    }
  }

  // Score each task
  const scored: ScoredTask[] = tasks.map((task) => {
    // Priority score (1-5 → 1 is best)
    const priorityScore = ((6 - task.priority) / 5) * 25;

    // Due date urgency
    let dueUrgency = 0;
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) dueUrgency = 30; // overdue
      else if (diffDays === 0) dueUrgency = 28;
      else if (diffDays === 1) dueUrgency = 20;
      else if (diffDays <= 7) dueUrgency = 15;
      else dueUrgency = 5;
    }

    // Goal importance
    let goalImportance = 0;
    if (task.goal) {
      goalImportance = ((6 - task.goal.priorityWeight) / 5) * 20;
    }

    // Task age (days since creation)
    const ageDays = Math.floor((today.getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const ageScore = Math.min(ageDays / 14, 1) * 15;

    // Stale goal bonus
    const staleGoalBonus = task.goalId && staleGoalIds.has(task.goalId) ? 10 : 0;

    const totalScore = priorityScore + dueUrgency + goalImportance + ageScore + staleGoalBonus;

    return {
      task,
      score: Math.round(totalScore * 10) / 10,
      breakdown: {
        priority: Math.round(priorityScore),
        dueUrgency,
        goalImportance: Math.round(goalImportance),
        age: Math.round(ageScore),
        staleGoalBonus,
      },
    };
  });

  // Sort by score descending, take top N
  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

// ─── Daily Focus ────────────────────────────────────────────────────────────

export type DailyFocus = {
  task: ScoredTask["task"];
  reason: string;
};

/**
 * Pick the single best task for today, considering:
 * - Day of week patterns from activity history
 * - Due date urgency
 * - Priority
 * - Goal alignment
 */
export async function getDailyFocus(userId: string): Promise<DailyFocus | null> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];

  // Get all open tasks
  const tasks = await prisma.task.findMany({
    where: { userId, status: { in: ["TODO", "IN_PROGRESS"] } },
    include: { goal: true },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });

  if (tasks.length === 0) return null;

  // Check if there's a pattern: what goals/tasks does the user usually complete on this day?
  const historicalDayCompletions = await prisma.$queryRaw<Array<{ goal_id: string | null; cnt: number }>>`
    SELECT metadata->>'goalId' as goal_id, COUNT(*) as cnt
    FROM activity_logs
    WHERE user_id = ${userId}::uuid
      AND entity_type = 'TASK'
      AND action = 'COMPLETED'
      AND EXTRACT(DOW FROM created_at) = ${dayOfWeek}
      AND created_at > NOW() - INTERVAL '30 days'
    GROUP BY metadata->>'goalId'
    ORDER BY cnt DESC
    LIMIT 3
  `;

  const preferredGoalIds = new Set(
    historicalDayCompletions.filter((h) => h.goal_id).map((h) => h.goal_id!)
  );

  // Score tasks with a daily focus bias
  const scored = tasks.map((task) => {
    let score = 0;

    // Priority (inverted): P1 = 40, P2 = 30, P3 = 20, P4 = 10, P5 = 0
    score += (6 - task.priority) * 8;

    // Due date urgency
    if (task.dueDate) {
      const due = new Date(task.dueDate);
      const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < 0) score += 35; // overdue
      else if (diffHours < 24) score += 30; // today
      else if (diffHours < 48) score += 20; // tomorrow
      else if (diffHours < 168) score += 10; // this week
    }

    // Historical day pattern bonus: if this task's goal is usually worked on this day
    if (task.goalId && preferredGoalIds.has(task.goalId)) {
      score += 15;
    }

    // Stale goal penalty: tasks on stale goals get a boost
    // (handled by the general scoring, but simplified here)

    return { task, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];

  // Generate a human-readable reason
  let reason = "";
  if (top.task.dueDate && new Date(top.task.dueDate) <= today) {
    reason = "Overdue — tackle this first.";
  } else if (top.task.dueDate && new Date(top.task.dueDate).toDateString() === today.toDateString()) {
    reason = "Due today.";
  } else if (top.task.priority <= 2) {
    reason = `High priority task.`;
  } else if (top.task.goalId && preferredGoalIds.has(top.task.goalId)) {
    reason = `You often work on this goal on ${dayName}s.`;
  } else {
    reason = "Recommended based on your priorities.";
  }

  return {
    task: {
      id: top.task.id,
      title: top.task.title,
      priority: top.task.priority,
      dueDate: top.task.dueDate?.toISOString() ?? null,
      goal: top.task.goal
        ? { id: top.task.goal.id, title: top.task.goal.title }
        : null,
      status: top.task.status,
      createdAt: top.task.createdAt.toISOString(),
      completedAt: top.task.completedAt?.toISOString() ?? null,
      recurrenceRule: top.task.recurrenceRule,
    },
    reason,
  };
}
