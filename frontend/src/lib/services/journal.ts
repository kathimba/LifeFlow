import { upsertEmbedding, deleteEmbedding } from "./embeddings";
import { prisma } from "@lib/prisma";
import {
  logJournalCreated,
  logJournalUpdated,
  logJournalDeleted,
} from "@lib/activity-log";

// ─── Types ──────────────────────────────────────────────────────────────────

export type JournalCreateInput = {
  content: string;
  mood?: number | null;
  energy?: number | null;
};

export type JournalUpdateInput = {
  content?: string;
  mood?: number | null;
  energy?: number | null;
};

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getEntries(
  userId: string,
  options?: { limit?: number }
) {
  return prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    ...(options?.limit ? { take: options.limit } : {}),
  });
}

export async function getEntryById(userId: string, entryId: string) {
  return prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createEntry(userId: string, input: JournalCreateInput) {
  const entry = await prisma.journalEntry.create({
    data: {
      userId,
      content: input.content,
      mood: input.mood ?? null,
      energy: input.energy ?? null,
    },
  });

  logJournalCreated(userId, entry.id, {
    mood: entry.mood,
    energy: entry.energy,
  });

  upsertEmbedding(userId, "JOURNAL", entry.id, entry.content).catch(console.error);

  return entry;
}

export async function updateEntry(
  userId: string,
  entryId: string,
  input: JournalUpdateInput
) {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("Journal entry not found");

  const entry = await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      ...(input.content !== undefined && { content: input.content }),
      ...(input.mood !== undefined && { mood: input.mood }),
      ...(input.energy !== undefined && { energy: input.energy }),
    },
  });

  logJournalUpdated(userId, entry.id, {
    mood: entry.mood,
    energy: entry.energy,
  });

  if (input.content !== undefined) {
    const updated = await prisma.journalEntry.findUnique({ where: { id: entryId }, select: { content: true } });
    upsertEmbedding(userId, "JOURNAL", entryId, updated?.content ?? "").catch(console.error);
  }

  return entry;
}

export async function deleteEntry(userId: string, entryId: string) {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("Journal entry not found");

  await prisma.journalEntry.delete({ where: { id: entryId } });

  logJournalDeleted(userId, entryId);

  deleteEmbedding(userId, "JOURNAL", entryId).catch(console.error);

  return { success: true };
}