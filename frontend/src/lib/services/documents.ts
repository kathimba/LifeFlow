import { prisma } from "@lib/prisma";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, buildStorageKey, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/r2";
import { upsertEmbedding, deleteEmbedding } from "./embeddings";

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocumentCreateInput = {
  file: File;
  title?: string;
  description?: string; 
  goalId?: string | null;
  taskId?: string | null;
};

export type DocumentUpdateInput = {
  title?: string;
  description?: string | null; 
  goalId?: string | null;
  taskId?: string | null;
};

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getDocuments(
  userId: string,
  filters?: { goalId?: string; taskId?: string }
) {
  return prisma.document.findMany({
    where: {
      userId,
      ...(filters?.goalId && { goalId: filters.goalId }),
      ...(filters?.taskId && { taskId: filters.taskId }),
    },
    include: {
      goal: { select: { id: true, title: true } },
      task: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentById(userId: string, documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, userId },
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function uploadDocument(
  userId: string,
  input: DocumentCreateInput
) {
  const { file, title, goalId, taskId } = input;

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
    throw new Error(`File type "${file.type}" not allowed`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate goal/task ownership if linked
  if (goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: { id: true },
    });
    if (!goal) throw new Error("Goal not found");
  }

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      select: { id: true },
    });
    if (!task) throw new Error("Task not found");
  }

  // Upload to R2
  const storageKey = buildStorageKey(userId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: storageKey,
      Body: buffer,
      ContentType: file.type,
    })
  );

  // Create DB record
  const document = await prisma.document.create({
    data: {
      userId,
      title: title || file.name,
      description: input.description ?? null, 
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storageKey,
      goalId: goalId ?? null,
      taskId: taskId ?? null,
    },
  });

  // Embed document
  const docText = [document.title, document.description].filter(Boolean).join(" ");
  upsertEmbedding(userId, "DOCUMENT", document.id, docText).catch(console.error);

  return document;
}

export async function updateDocument(
  userId: string,
  documentId: string,
  input: DocumentUpdateInput
) {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true },
  });

  if (!existing) throw new Error("Document not found");

  // Validate goal/task ownership if changing
  if (input.goalId) {
    const goal = await prisma.goal.findFirst({
      where: { id: input.goalId, userId },
      select: { id: true },
    });
    if (!goal) throw new Error("Goal not found");
  }

  if (input.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: input.taskId, userId },
      select: { id: true },
    });
    if (!task) throw new Error("Task not found");
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.goalId !== undefined && { goalId: input.goalId }),
      ...(input.taskId !== undefined && { taskId: input.taskId }),
    },
  });

  // Update embedding if title or description changed
  if (input.title !== undefined || input.description !== undefined) {
    const docText = [updated.title, updated.description].filter(Boolean).join(" ");
    upsertEmbedding(userId, "DOCUMENT", documentId, docText).catch(console.error);
  }

  return updated;
}

export async function deleteDocument(userId: string, documentId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true, storageKey: true },
  });

  if (!doc) throw new Error("Document not found");

  // Delete from R2
  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: doc.storageKey,
    })
  );

  // Delete from DB
  await prisma.document.delete({ where: { id: documentId } });

  // Delete embedding
  deleteEmbedding(userId, "DOCUMENT", documentId).catch(console.error);

  return { success: true };
}

export async function getDocumentDownloadUrl(userId: string, documentId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
    select: { id: true, storageKey: true, fileName: true },
  });

  if (!doc) throw new Error("Document not found");

  const downloadUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: R2_BUCKET, Key: doc.storageKey }),
    { expiresIn: 3600 }
  );

  return { downloadUrl, fileName: doc.fileName };
}