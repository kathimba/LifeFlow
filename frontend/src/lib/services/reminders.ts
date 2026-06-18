import { prisma } from "@lib/prisma";
import type { ReminderStatus } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ReminderCreateInput = {
  taskId: string;
  remindAt: string; // ISO datetime
  message?: string;
};

export type ReminderUpdateInput = {
  remindAt?: string;
  message?: string | null;
  status?: ReminderStatus;
};

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getReminders(
  userId: string,
  filters?: { status?: ReminderStatus; taskId?: string }
) {
  return prisma.reminder.findMany({
    where: {
      userId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.taskId && { taskId: filters.taskId }),
    },
    include: {
      task: {
        select: { id: true, title: true, dueDate: true, status: true },
      },
    },
    orderBy: [{ status: "asc" }, { remindAt: "asc" }],
  });
}

export async function getReminderById(userId: string, reminderId: string) {
  return prisma.reminder.findFirst({
    where: { id: reminderId, userId },
    include: {
      task: { select: { id: true, title: true, dueDate: true, status: true } },
    },
  });
}

export async function getDueReminders(userId: string) {
  const now = new Date();
  return prisma.reminder.findMany({
    where: {
      userId,
      status: "PENDING",
      remindAt: { lte: now },
    },
    include: {
      task: { select: { id: true, title: true, dueDate: true } },
    },
    orderBy: { remindAt: "asc" },
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createReminder(
  userId: string,
  input: ReminderCreateInput
) {
  // Validate task ownership
  const task = await prisma.task.findFirst({
    where: { id: input.taskId, userId },
    select: { id: true },
  });
  if (!task) throw new Error("Task not found");

  return prisma.reminder.create({
    data: {
      userId,
      taskId: input.taskId,
      remindAt: new Date(input.remindAt),
      message: input.message,
    },
    include: {
      task: { select: { id: true, title: true, dueDate: true, status: true } },
    },
  });
}

export async function updateReminder(
  userId: string,
  reminderId: string,
  input: ReminderUpdateInput
) {
  const existing = await prisma.reminder.findFirst({
    where: { id: reminderId, userId },
  });
  if (!existing) throw new Error("Reminder not found");

  return prisma.reminder.update({
    where: { id: reminderId },
    data: {
      ...(input.remindAt !== undefined && { remindAt: new Date(input.remindAt) }),
      ...(input.message !== undefined && { message: input.message }),
      ...(input.status !== undefined && { status: input.status }),
    },
    include: {
      task: { select: { id: true, title: true, dueDate: true, status: true } },
    },
  });
}

export async function dismissReminder(userId: string, reminderId: string) {
  const existing = await prisma.reminder.findFirst({
    where: { id: reminderId, userId },
  });
  if (!existing) throw new Error("Reminder not found");

  return prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "DISMISSED" },
  });
}

export async function deleteReminder(userId: string, reminderId: string) {
  const existing = await prisma.reminder.findFirst({
    where: { id: reminderId, userId },
  });
  if (!existing) throw new Error("Reminder not found");

  await prisma.reminder.delete({ where: { id: reminderId } });
  return { success: true };
}