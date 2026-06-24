import { prisma } from "@lib/prisma";

export type WeeklyReview = {
  weekStart: string;
  weekEnd: string;
  tasksCompleted: number;
  mostProductiveDay: string | null;  // e.g. "Tuesday"
  topGoal: { id: string; title: string; count: number } | null;
  staleGoals: { id: string; title: string; daysSinceLastCompletion: number }[];
  recommendation: string | null;
  averageMood: number | null;
  averageEnergy: number | null;
};

/**
 * Get weekly review for the current week (Monday–Sunday).
 */
export async function getWeeklyReview(userId: string): Promise<WeeklyReview> {
  const now = new Date();
  const dayOfWeek = now.getDay(); // Sunday=0, Monday=1, ...
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const weekStart = monday.toISOString();
  const weekEnd = sunday.toISOString();

  // 1. Tasks completed this week
  const completedLogs = await prisma.activityLog.findMany({
    where: {
      userId,
      entityType: "TASK",
      action: "COMPLETED",
      createdAt: { gte: monday, lte: sunday },
    },
    select: {
      createdAt: true,
      metadata: true,
    },
  });

  const tasksCompleted = completedLogs.length;

  // 2. Most productive day
  const dayCounts = new Map<number, number>(); // 0=Sun,1=Mon,...
  for (const log of completedLogs) {
    const d = log.createdAt.getDay();
    dayCounts.set(d, (dayCounts.get(d) || 0) + 1);
  }
  let mostProductiveDay: string | null = null;
  let maxCount = 0;
  for (const [day, count] of dayCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostProductiveDay = dayNames[day];
    }
  }

  // 3. Top goal (by completed tasks this week)
  const goalCounts = new Map<string, { id: string; title: string; count: number }>();
  for (const log of completedLogs) {
    const metadata = log.metadata as Record<string, any> | null;
    const goalId = metadata?.goalId;
    if (goalId) {
      const existing = goalCounts.get(goalId);
      if (existing) {
        existing.count++;
      } else {
        // We'll fetch goal title later
        goalCounts.set(goalId, { id: goalId, title: "", count: 1 });
      }
    }
  }
  let topGoal: WeeklyReview["topGoal"] = null;
  if (goalCounts.size > 0) {
    const sorted = [...goalCounts.values()].sort((a, b) => b.count - a.count);
    const best = sorted[0];
    const goal = await prisma.goal.findFirst({
      where: { id: best.id, userId },
      select: { title: true },
    });
    if (goal) {
      topGoal = { id: best.id, title: goal.title, count: best.count };
    } else {
      topGoal = { id: best.id, title: "(deleted goal)", count: best.count };
    }
  }

  // 4. Stale goals: active goals with no completed tasks in last 14 days
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const activeGoals = await prisma.goal.findMany({
    where: { userId, status: "ACTIVE" },
    select: { id: true, title: true },
  });

  const staleGoals: WeeklyReview["staleGoals"] = [];
  for (const goal of activeGoals) {
    const recentCompletion = await prisma.activityLog.findFirst({
      where: {
        userId,
        entityType: "TASK",
        action: "COMPLETED",
        createdAt: { gte: twoWeeksAgo },
        metadata: { path: ["goalId"], equals: goal.id },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!recentCompletion) {
      // Also check if there are any tasks at all for this goal
      const taskCount = await prisma.task.count({
        where: { goalId: goal.id, userId },
      });
      if (taskCount > 0) {
        staleGoals.push({ id: goal.id, title: goal.title, daysSinceLastCompletion: 14 });
      }
    }
  }

  // 5. Recommendation based on stale goals
  let recommendation: string | null = null;
  if (staleGoals.length > 0) {
    const goalNames = staleGoals.map(g => g.title).join(", ");
    recommendation = `Schedule tasks for: ${goalNames}. Break each goal into a small next step.`;
  } else if (tasksCompleted === 0) {
    recommendation = "Start small – capture one task for today.";
  } else if (tasksCompleted > 10) {
    recommendation = "Great week! Consider reviewing your priorities for next week.";
  }

  // 6. Average mood and energy from journal entries this week
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      userId,
      createdAt: { gte: monday, lte: sunday },
      OR: [
        { mood: { not: null } },
        { energy: { not: null } },
      ],
    },
    select: { mood: true, energy: true },
  });

  let averageMood: number | null = null;
  let averageEnergy: number | null = null;
  if (journalEntries.length > 0) {
    const moods = journalEntries.filter(e => e.mood != null).map(e => e.mood!);
    const energies = journalEntries.filter(e => e.energy != null).map(e => e.energy!);
    if (moods.length > 0) averageMood = Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10;
    if (energies.length > 0) averageEnergy = Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10;
  }

  return {
    weekStart,
    weekEnd,
    tasksCompleted,
    mostProductiveDay,
    topGoal,
    staleGoals,
    recommendation,
    averageMood,
    averageEnergy,
  };
}

const dayNames: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export type HourlyProductivity = {
  hour: number;
  label: string;
  tasksCompleted: number;
};

export type GoalTrend = {
  goalId: string;
  goalTitle: string;
  weeklyData: { weekLabel: string; completed: number; total: number }[];
};

/**
 * Returns tasks completed per hour of day (all time, or last N days).
 */
export async function getPeakProductivity(
  userId: string,
  daysBack = 30
): Promise<HourlyProductivity[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const logs = await prisma.activityLog.findMany({
    where: {
      userId,
      entityType: "TASK",
      action: "COMPLETED",
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  const hourCounts = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourCounts.set(h, 0);
  for (const log of logs) {
    const hour = log.createdAt.getUTCHours(); // UTC — adjust for timezone if needed
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  }

  const hourLabels: Record<number, string> = {
    0: "12am", 1: "1am", 2: "2am", 3: "3am", 4: "4am", 5: "5am",
    6: "6am", 7: "7am", 8: "8am", 9: "9am", 10: "10am", 11: "11am",
    12: "12pm", 13: "1pm", 14: "2pm", 15: "3pm", 16: "4pm", 17: "5pm",
    18: "6pm", 19: "7pm", 20: "8pm", 21: "9pm", 22: "10pm", 23: "11pm",
  };

  return Array.from(hourCounts.entries()).map(([hour, count]) => ({
    hour,
    label: hourLabels[hour],
    tasksCompleted: count,
  }));
}

/**
 * Returns weekly goal progress for the last N weeks.
 */
export async function getGoalTrends(
  userId: string,
  weeks = 8
): Promise<GoalTrend[]> {
  const activeGoals = await prisma.goal.findMany({
    where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true, title: true },
  });

  const trends: GoalTrend[] = [];

  for (const goal of activeGoals) {
    const weeklyData: GoalTrend["weeklyData"] = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - i * 7); // Monday
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const completed = await prisma.activityLog.count({
        where: {
          userId,
          entityType: "TASK",
          action: "COMPLETED",
          createdAt: { gte: weekStart, lte: weekEnd },
          metadata: { path: ["goalId"], equals: goal.id },
        },
      });

      const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

      weeklyData.push({ weekLabel, completed, total: 0 }); // total not used currently
    }

    trends.push({ goalId: goal.id, goalTitle: goal.title, weeklyData });
  }

  // Only return goals that have at least one completed task in the period
  return trends.filter((t) => t.weeklyData.some((w) => w.completed > 0));
}

// ─── Weekly Productivity Score ─────────────────────────────────────────────

export type WeeklyScore = {
  score: number;
  change: number;        // % change vs last week
  tasksCompleted: number;
  tasksCreated: number;
  focus: number;         // % of tasks linked to a goal
  consistency: number;   // days with activity / 7
  journalDays: number;   // days with journal entries
};

export async function getWeeklyScore(userId: string): Promise<WeeklyScore> {
  const now = new Date();
  const dayOfWeek = now.getDay();

  // Current week: Monday–Sunday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  thisMonday.setHours(0, 0, 0, 0);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  thisSunday.setHours(23, 59, 59, 999);

  // Last week
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisSunday);
  lastSunday.setDate(thisSunday.getDate() - 7);

  // --- Current week ---
  const createdThisWeek = await prisma.activityLog.count({
    where: { userId, entityType: "TASK", action: "CREATED", createdAt: { gte: thisMonday, lte: thisSunday } },
  });

  const completedThisWeek = await prisma.activityLog.count({
    where: { userId, entityType: "TASK", action: "COMPLETED", createdAt: { gte: thisMonday, lte: thisSunday } },
  });

  // Focus: % of completed tasks that have a goalId
  const completedWithGoal = await prisma.activityLog.count({
    where: {
      userId, entityType: "TASK", action: "COMPLETED",
      createdAt: { gte: thisMonday, lte: thisSunday },
      metadata: { path: ["goalId"], not: null },
    },
  });
  const focus = completedThisWeek > 0 ? Math.round((completedWithGoal / completedThisWeek) * 100) : 0;

  // Consistency: unique days with any task activity this week
  const activeDays = await prisma.$queryRaw<Array<{ day: string }>>`
    SELECT DISTINCT DATE(created_at) as day
    FROM activity_logs
    WHERE user_id = ${userId}::uuid
      AND entity_type = 'TASK'
      AND created_at >= ${thisMonday}
      AND created_at <= ${thisSunday}
  `;
  const consistency = activeDays.length;

  // Journal engagement: days with journal entries this week
  const journalDays = await prisma.$queryRaw<Array<{ day: string }>>`
    SELECT DISTINCT DATE(created_at) as day
    FROM journal_entries
    WHERE user_id = ${userId}::uuid
      AND created_at >= ${thisMonday}
      AND created_at <= ${thisSunday}
  `;

  // --- Last week (for comparison) ---
  const completedLastWeek = await prisma.activityLog.count({
    where: { userId, entityType: "TASK", action: "COMPLETED", createdAt: { gte: lastMonday, lte: lastSunday } },
  });

  const createdLastWeek = await prisma.activityLog.count({
    where: { userId, entityType: "TASK", action: "CREATED", createdAt: { gte: lastMonday, lte: lastSunday } },
  });

  // --- Score calculation ---
  // Task completion rate: completed / created (capped at 100%)
  const completionRate = createdThisWeek > 0 ? Math.min(completedThisWeek / createdThisWeek, 1) : completedThisWeek > 0 ? 1 : 0;

  // Goal progress: average across active goals
  const goals = await prisma.goal.findMany({
    where: { userId, status: { in: ["ACTIVE", "PAUSED"] } },
    select: { progress: true },
  });
  const avgGoalProgress = goals.length > 0
    ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length / 100
    : 0;

  const score = Math.round(
    completionRate * 40 +
    avgGoalProgress * 30 +
    (consistency / 7) * 20 +
    (Math.min(journalDays.length, 7) / 7) * 10
  );

  // --- Change vs last week ---
  let change = 0;
  if (completedLastWeek > 0) {
    change = Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100);
  } else if (completedThisWeek > 0) {
    change = 100; // from 0 to something
  }

  return {
    score,
    change,
    tasksCompleted: completedThisWeek,
    tasksCreated: createdThisWeek,
    focus,
    consistency,
    journalDays: journalDays.length,
  };
}

// ─── Task Flow (Created vs Completed) ──────────────────────────────────────

export type TaskFlow = {
  weeks: { weekLabel: string; created: number; completed: number; ratio: number }[];
  currentRatio: number;
  status: "healthy" | "normal" | "overloaded";
};

export async function getTaskFlow(userId: string, weeks = 8): Promise<TaskFlow> {
  const now = new Date();
  const dayOfWeek = now.getDay();

  const weeklyData: TaskFlow["weeks"] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) - i * 7);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const created = await prisma.activityLog.count({
      where: { userId, entityType: "TASK", action: "CREATED", createdAt: { gte: monday, lte: sunday } },
    });
    const completed = await prisma.activityLog.count({
      where: { userId, entityType: "TASK", action: "COMPLETED", createdAt: { gte: monday, lte: sunday } },
    });

    const ratio = created > 0 ? Math.round((completed / created) * 100) : completed > 0 ? 100 : 0;

    weeklyData.push({
      weekLabel: monday.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      created,
      completed,
      ratio,
    });
  }

  const currentRatio = weeklyData[weeklyData.length - 1]?.ratio ?? 0;
  const status: TaskFlow["status"] = currentRatio >= 80 ? "healthy" : currentRatio >= 50 ? "normal" : "overloaded";

  return { weeks: weeklyData, currentRatio, status };
}