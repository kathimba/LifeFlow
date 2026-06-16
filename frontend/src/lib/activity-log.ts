import { after } from "next/server"
import { ActionType, EntityType, Prisma } from "@prisma/client"
import { prisma } from "@lib/prisma"

export type ActivityLogInput = {
  userId: string
  entityType: EntityType
  entityId: string
  action: ActionType
  metadata?: Prisma.InputJsonValue
}

async function writeActivityLog(input: ActivityLogInput) {
  try {
    await prisma.activityLog.create({ data: input })
  } catch (error) {
    console.error("[activity-log]", error)
  }
}

/** Fire-and-forget activity log after the response is sent. Never throws. */
export function logActivity(input: ActivityLogInput) {
  after(() => writeActivityLog(input))
}

export function logTaskCreated(
  userId: string,
  taskId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.TASK,
    entityId: taskId,
    action: ActionType.CREATED,
    metadata,
  })
}

export function logTaskUpdated(
  userId: string,
  taskId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.TASK,
    entityId: taskId,
    action: ActionType.UPDATED,
    metadata,
  })
}

export function logTaskCompleted(
  userId: string,
  taskId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.TASK,
    entityId: taskId,
    action: ActionType.COMPLETED,
    metadata,
  })
}

export function logTaskDeleted(
  userId: string,
  taskId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.TASK,
    entityId: taskId,
    action: ActionType.DELETED,
    metadata,
  })
}

export function logGoalCreated(
  userId: string,
  goalId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.GOAL,
    entityId: goalId,
    action: ActionType.CREATED,
    metadata,
  })
}

export function logGoalUpdated(
  userId: string,
  goalId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.GOAL,
    entityId: goalId,
    action: ActionType.UPDATED,
    metadata,
  })
}

export function logGoalCompleted(
  userId: string,
  goalId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.GOAL,
    entityId: goalId,
    action: ActionType.COMPLETED,
    metadata,
  })
}

export function logGoalDeleted(
  userId: string,
  goalId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.GOAL,
    entityId: goalId,
    action: ActionType.DELETED,
    metadata,
  })
}

export function logJournalCreated(
  userId: string,
  entryId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.JOURNAL,
    entityId: entryId,
    action: ActionType.CREATED,
    metadata,
  })
}

export function logJournalUpdated(
  userId: string,
  entryId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.JOURNAL,
    entityId: entryId,
    action: ActionType.UPDATED,
    metadata,
  })
}

export function logJournalDeleted(
  userId: string,
  entryId: string,
  metadata?: Prisma.InputJsonValue
) {
  logActivity({
    userId,
    entityType: EntityType.JOURNAL,
    entityId: entryId,
    action: ActionType.DELETED,
    metadata,
  })
}
