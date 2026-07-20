import { prisma } from "@lib/prisma";
import { Prisma } from "@prisma/client";

export type NudgeType =
  | "stale_goal"
  | "missing_next_action"
  | "deadline_risk"
  | "momentum"
  | "priority_misalignment";

export type Nudge = {
  type: NudgeType;
  severity: "positive" | "warning" | "critical";
  title: string;
  message: string;
  goalId?: string;
  goalTitle?: string;
  metadata?: Record<string, any>;
};

/**
 * Generate all nudges for a user.
 */
export async function getGoalNudges(userId: string): Promise<Nudge[]> {
  const nudges: Nudge[] = [];

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const activeGoals = await prisma.goal.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      tasks: {
        where: { userId },
        select: { id: true, status: true, completedAt: true, createdAt: true },
      },
      subGoals: {
        where: { userId },
        include: {
          tasks: {
            where: { userId, status: { in: ["TODO", "IN_PROGRESS"] } },
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (activeGoals.length === 0) return nudges;

  // ------------------------------------------------------------------
  // 1. Stale Goal Detection
  // ------------------------------------------------------------------
  for (const goal of activeGoals) {
    const completedTasks = goal.tasks.filter((t) => t.status === "DONE");
    const lastCompletion = completedTasks.length
      ? new Date(Math.max(...completedTasks.map((t) => t.completedAt!.getTime())))
      : null;

    const daysSinceLastActivity = lastCompletion
      ? Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((today.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastActivity >= 30) {
      nudges.push({
        type: "stale_goal",
        severity: "critical",
        title: `${goal.title} is critically stale`,
        message: `No completed tasks in ${daysSinceLastActivity} days. Schedule a small step this week.`,
        goalId: goal.id,
        goalTitle: goal.title,
        metadata: { daysSinceLastActivity },
      });
    } else if (daysSinceLastActivity >= 14) {
      nudges.push({
        type: "stale_goal",
        severity: "warning",
        title: `${goal.title} has been quiet for ${daysSinceLastActivity} days`,
        message: `Consider adding a task to keep this goal moving.`,
        goalId: goal.id,
        goalTitle: goal.title,
        metadata: { daysSinceLastActivity },
      });
    } else if (daysSinceLastActivity >= 7) {
      nudges.push({
        type: "stale_goal",
        severity: "warning",
        title: `${goal.title} hasn't seen progress in a week`,
        message: `A quick next step can maintain momentum.`,
        goalId: goal.id,
        goalTitle: goal.title,
        metadata: { daysSinceLastActivity },
      });
    }
  }

  // ------------------------------------------------------------------
  // 2. Missing Next Action
  // ------------------------------------------------------------------
  for (const goal of activeGoals) {
    const openTasks = goal.tasks.filter(
      (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
    );

    // Check if sub-goals have open tasks
    let hasSubGoalActivity = false;
    if (openTasks.length === 0 && goal.subGoals && goal.subGoals.length > 0) {
      hasSubGoalActivity = goal.subGoals.some(
        (sub) =>
          sub.tasks?.some(
            (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
          )
      );
    }

    // Only flag if no open tasks AND no sub-goal activity
    if (openTasks.length === 0 && !hasSubGoalActivity) {
      nudges.push({
        type: "missing_next_action",
        severity: "warning",
        title: `${goal.title} has no active tasks`,
        message: `Break this goal into a concrete next step.`,
        goalId: goal.id,
        goalTitle: goal.title,
      });
    }
  }

  // ------------------------------------------------------------------
  // 3. Goal Deadline Risk
  // ------------------------------------------------------------------
  for (const goal of activeGoals) {
    if (!goal.targetDate) continue;
    const target = new Date(goal.targetDate);
    const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) continue;

    const totalTasks = goal.tasks.length;
    const doneTasks = goal.tasks.filter((t) => t.status === "DONE").length;
    if (totalTasks === 0) continue;

    const elapsed = Math.max(
      Math.floor((today.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      1
    );
    const totalDuration = elapsed + daysRemaining;
    const expectedProgress = Math.min((elapsed / totalDuration) * 100, 100);
    const actualProgress = goal.progress; // 0-100

    if (actualProgress < expectedProgress - 15) {
      nudges.push({
        type: "deadline_risk",
        severity: "warning",
        title: `${goal.title} may miss its target date`,
        message: `${daysRemaining} days left but only ${actualProgress}% done. Consider increasing effort.`,
        goalId: goal.id,
        goalTitle: goal.title,
        metadata: { daysRemaining, actualProgress, expectedProgress: Math.round(expectedProgress) },
      });
    }
  }

  // ------------------------------------------------------------------
  // 4. Goal Momentum (positive)
  // ------------------------------------------------------------------
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentCompletions = await prisma.activityLog.findMany({
    where: {
      userId,
      entityType: "TASK",
      action: "COMPLETED",
      createdAt: { gte: weekAgo },
      metadata: { path: ["goalId"], not: Prisma.JsonNullValueFilter.JsonNull },
    },
    select: { metadata: true },
  });

  const completionsByGoal = new Map<string, number>();
  for (const log of recentCompletions) {
    const goalId = (log.metadata as Record<string, any>)?.goalId as string;
    if (goalId) completionsByGoal.set(goalId, (completionsByGoal.get(goalId) || 0) + 1);
  }

  for (const [goalId, count] of completionsByGoal) {
    if (count >= 5) {
      const goal = activeGoals.find((g) => g.id === goalId);
      if (goal) {
        nudges.push({
          type: "momentum",
          severity: "positive",
          title: `Great progress on ${goal.title}`,
          message: `You've completed ${count} tasks this week!`,
          goalId: goal.id,
          goalTitle: goal.title,
          metadata: { completedThisWeek: count },
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // 5. Priority Misalignment
  // ------------------------------------------------------------------
  if (activeGoals.length >= 2 && completionsByGoal.size > 0) {
    // Sort goals by priorityWeight ascending (1 = highest priority)
    const sortedGoals = [...activeGoals].sort((a, b) => a.priorityWeight - b.priorityWeight);
    const topPriorityGoal = sortedGoals[0];
    const totalCompleted = Array.from(completionsByGoal.values()).reduce((a, b) => a + b, 0);
    const topGoalCompleted = completionsByGoal.get(topPriorityGoal.id) || 0;
    const topGoalShare = totalCompleted ? (topGoalCompleted / totalCompleted) * 100 : 0;

    if (topGoalShare < 15) {
      nudges.push({
        type: "priority_misalignment",
        severity: "warning",
        title: `Your top priority goal "${topPriorityGoal.title}" is under-served`,
        message: `Only ${Math.round(topGoalShare)}% of your effort went to it this week. Consider refocusing.`,
        goalId: topPriorityGoal.id,
        goalTitle: topPriorityGoal.title,
        metadata: { share: Math.round(topGoalShare) },
      });
    }
  }

  return nudges;
}