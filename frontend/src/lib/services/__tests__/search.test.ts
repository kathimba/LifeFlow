import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { search } from "../search";

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
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.journalEntry.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.document.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.journalEntry.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.document.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("Search Service", () => {
  it("returns empty array for no matches", async () => {
    const results = await search(TEST_USER_ID, "nonexistent");
    expect(results).toEqual([]);
  });

  it("returns empty array for empty query", async () => {
    const results = await search(TEST_USER_ID, "");
    expect(results).toEqual([]);
  });

  it("finds tasks by title", async () => {
    await prisma.task.create({
      data: {
        userId: TEST_USER_ID,
        title: "Deploy Docker container to production",
      },
    });

    const results = await search(TEST_USER_ID, "docker");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("task");
  });

  it("finds goals by title", async () => {
    await prisma.goal.create({
      data: {
        userId: TEST_USER_ID,
        title: "Learn Kubernetes orchestration",
      },
    });

    const results = await search(TEST_USER_ID, "kubernetes");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("goal");
  });

  it("finds journal entries by content", async () => {
    await prisma.journalEntry.create({
      data: {
        userId: TEST_USER_ID,
        content: "Today I learned about PostgreSQL full-text search",
      },
    });

    const results = await search(TEST_USER_ID, "postgresql");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("journal");
  });

  it("finds documents by title", async () => {
    await prisma.document.create({
      data: {
        userId: TEST_USER_ID,
        title: "System Architecture Diagram",
        fileName: "architecture.png",
        fileType: "image/png",
        fileSize: 50000,
        storageKey: `users/${TEST_USER_ID}/arch.png`,
      },
    });

    const results = await search(TEST_USER_ID, "architecture");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("document");
  });

  it("filters by type", async () => {
    await prisma.task.create({
      data: { userId: TEST_USER_ID, title: "Docker task" },
    });
    await prisma.goal.create({
      data: { userId: TEST_USER_ID, title: "Docker goal" },
    });

    const results = await search(TEST_USER_ID, "docker", { types: ["task"] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.type === "task")).toBe(true);
  });

  it("respects limit", async () => {
    for (let i = 0; i < 15; i++) {
      await prisma.task.create({
        data: { userId: TEST_USER_ID, title: `Docker task ${i}` },
      });
    }

    const results = await search(TEST_USER_ID, "docker", { limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("handles special characters safely", async () => {
    const results = await search(TEST_USER_ID, "'; DROP TABLE tasks; --");
    expect(results).toEqual([]); // Should not crash
  });
});