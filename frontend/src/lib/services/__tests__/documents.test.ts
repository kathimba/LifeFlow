import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentDownloadUrl,
} from "../documents";

const prisma = new PrismaClient();
const TEST_USER_ID = randomUUID();

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: `${TEST_USER_ID}@test.com`,
    },
  });
});

beforeEach(async () => {
  await prisma.document.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  await prisma.document.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.$disconnect();
});

// Helper to create a document directly via Prisma (bypasses R2 upload)
async function seedDocument(userId: string, overrides: Record<string, any> = {}) {
  return prisma.document.create({
    data: {
      userId,
      title: "Test Document",
      description: null,
      fileName: "test.pdf",
      fileType: "application/pdf",
      fileSize: 1024,
      storageKey: `users/${userId}/test-${Date.now()}.pdf`,
      ...overrides,
    },
  });
}

describe("Documents Service", () => {
  // ─── Queries ──────────────────────────────────────────────────────────────

  describe("getDocuments", () => {
    it("returns empty array for user with no documents", async () => {
      const docs = await getDocuments(TEST_USER_ID);
      expect(docs).toEqual([]);
    });

    it("returns all documents for a user", async () => {
      await seedDocument(TEST_USER_ID, { title: "Doc A" });
      await seedDocument(TEST_USER_ID, { title: "Doc B" });

      const docs = await getDocuments(TEST_USER_ID);
      expect(docs.length).toBe(2);
      // Newest first
      expect(docs[0].title).toBe("Doc B");
    });

    it("filters by goalId", async () => {
      const goal = await prisma.goal.create({
        data: { userId: TEST_USER_ID, title: "Test Goal" },
      });

      await seedDocument(TEST_USER_ID, { title: "Linked", goalId: goal.id });
      await seedDocument(TEST_USER_ID, { title: "Unlinked" });

      const docs = await getDocuments(TEST_USER_ID, { goalId: goal.id });
      expect(docs.length).toBe(1);
      expect(docs[0].title).toBe("Linked");
    });

    it("filters by taskId", async () => {
      const task = await prisma.task.create({
        data: { userId: TEST_USER_ID, title: "Test Task" },
      });

      await seedDocument(TEST_USER_ID, { title: "Task Doc", taskId: task.id });
      await seedDocument(TEST_USER_ID, { title: "Not Linked" });

      const docs = await getDocuments(TEST_USER_ID, { taskId: task.id });
      expect(docs.length).toBe(1);
      expect(docs[0].title).toBe("Task Doc");
    });

    it("includes goal and task relations", async () => {
      const goal = await prisma.goal.create({
        data: { userId: TEST_USER_ID, title: "Goal X" },
      });
      const task = await prisma.task.create({
        data: { userId: TEST_USER_ID, title: "Task Y" },
      });

      await seedDocument(TEST_USER_ID, {
        title: "Fully Linked",
        goalId: goal.id,
        taskId: task.id,
      });

      const docs = await getDocuments(TEST_USER_ID);
      expect(docs[0].goal).toBeDefined();
      expect(docs[0].goal!.title).toBe("Goal X");
      expect(docs[0].task).toBeDefined();
      expect(docs[0].task!.title).toBe("Task Y");
    });
  });

  describe("getDocumentById", () => {
    it("returns document if owned by user", async () => {
      const doc = await seedDocument(TEST_USER_ID, { title: "Find Me" });

      const found = await getDocumentById(TEST_USER_ID, doc.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe("Find Me");
    });

    it("returns null for another user's document", async () => {
      const doc = await seedDocument(TEST_USER_ID);

      const found = await getDocumentById("00000000-0000-0000-0000-000000000001", doc.id);
      expect(found).toBeNull();
    });

    it("returns null for non-existent document", async () => {
      const found = await getDocumentById(TEST_USER_ID, "00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  describe("updateDocument", () => {
    it("updates title", async () => {
      const doc = await seedDocument(TEST_USER_ID, { title: "Old Title" });

      const updated = await updateDocument(TEST_USER_ID, doc.id, {
        title: "New Title",
      });

      expect(updated.title).toBe("New Title");
    });

    it("updates description", async () => {
      const doc = await seedDocument(TEST_USER_ID);

      const updated = await updateDocument(TEST_USER_ID, doc.id, {
        description: "A helpful caption",
      });

      expect(updated.description).toBe("A helpful caption");
    });

    it("clears description when set to null", async () => {
      const doc = await seedDocument(TEST_USER_ID, {
        description: "Old caption",
      });

      const updated = await updateDocument(TEST_USER_ID, doc.id, {
        description: null,
      });

      expect(updated.description).toBeNull();
    });

    it("links to a goal", async () => {
      const goal = await prisma.goal.create({
        data: { userId: TEST_USER_ID, title: "Link Goal" },
      });
      const doc = await seedDocument(TEST_USER_ID);

      const updated = await updateDocument(TEST_USER_ID, doc.id, {
        goalId: goal.id,
      });

      expect(updated.goalId).toBe(goal.id);
    });

    it("unlinks from a goal (sets null)", async () => {
      const goal = await prisma.goal.create({
        data: { userId: TEST_USER_ID, title: "Temp Goal" },
      });
      const doc = await seedDocument(TEST_USER_ID, { goalId: goal.id });

      const updated = await updateDocument(TEST_USER_ID, doc.id, {
        goalId: null,
      });

      expect(updated.goalId).toBeNull();
    });

    it("throws on non-existent document", async () => {
      await expect(
        updateDocument(TEST_USER_ID, "00000000-0000-0000-0000-000000000000", {
          title: "Nope",
        })
      ).rejects.toThrow("Document not found");
    });

    it("throws when linking to non-existent goal", async () => {
      const doc = await seedDocument(TEST_USER_ID);

      await expect(
        updateDocument(TEST_USER_ID, doc.id, {
          goalId: "00000000-0000-0000-0000-000000000000",
        })
      ).rejects.toThrow("Goal not found");
    });

    it("throws when linking to non-existent task", async () => {
      const doc = await seedDocument(TEST_USER_ID);

      await expect(
        updateDocument(TEST_USER_ID, doc.id, {
          taskId: "00000000-0000-0000-0000-000000000000",
        })
      ).rejects.toThrow("Task not found");
    });
  });

  describe("deleteDocument", () => {
    // This test verifies the ownership check works.
    // Full delete (including R2) requires mocking the S3 client
    // or running against a real R2 bucket.
    it("throws on non-existent document", async () => {
      await expect(
        deleteDocument(TEST_USER_ID, "00000000-0000-0000-0000-000000000000")
      ).rejects.toThrow("Document not found");
    });

    it("verifies ownership before attempting delete", async () => {
      const doc = await seedDocument(TEST_USER_ID);

      // Attempting to delete another user's document should throw
      await expect(
        deleteDocument("00000000-0000-0000-0000-000000000001", doc.id)
      ).rejects.toThrow("Document not found");
    });
  });

  describe("getDocumentDownloadUrl", () => {
    it("throws on non-existent document", async () => {
      await expect(
        getDocumentDownloadUrl(TEST_USER_ID, "00000000-0000-0000-0000-000000000000")
      ).rejects.toThrow("Document not found");
    });

    // Full integration test for download URL requires a real R2 bucket
    // This validates the ownership check at minimum
  });
});