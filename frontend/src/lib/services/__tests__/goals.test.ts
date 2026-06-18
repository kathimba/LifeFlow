import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createGoal, getGoals, updateGoal, deleteGoal } from "../goals";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const TEST_USER_ID = randomUUID();

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: { id: TEST_USER_ID, email: `${TEST_USER_ID}@test.com` },
  });
});

beforeEach(async () => {
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("Goals Service", () => {
  describe("createGoal", () => {
    it("creates a goal with defaults", async () => {
      const goal = await createGoal(TEST_USER_ID, { title: "Test goal" });
      expect(goal.title).toBe("Test goal");
      expect(goal.priorityWeight).toBe(3);
      expect(goal.progress).toBe(0);
    });

    it("creates with custom priority", async () => {
      const goal = await createGoal(TEST_USER_ID, {
        title: "Urgent",
        priorityWeight: 1,
      });
      expect(goal.priorityWeight).toBe(1);
    });
  });

  describe("getGoals", () => {
    it("returns goals ordered by priority", async () => {
      await createGoal(TEST_USER_ID, { title: "Low", priorityWeight: 5 });
      await createGoal(TEST_USER_ID, { title: "High", priorityWeight: 1 });

      const goals = await getGoals(TEST_USER_ID);
      expect(goals[0].priorityWeight).toBe(1);
      expect(goals[1].priorityWeight).toBe(5);
    });
  });

  describe("deleteGoal", () => {
    it("unlinks tasks before deleting", async () => {
      const goal = await createGoal(TEST_USER_ID, { title: "To delete" });
      await prisma.task.create({
        data: {
          userId: TEST_USER_ID,
          title: "Linked task",
          goalId: goal.id,
        },
      });

      await deleteGoal(TEST_USER_ID, goal.id);

      // Task should still exist but with null goalId
      const tasks = await prisma.task.findMany({
        where: { userId: TEST_USER_ID },
      });
      expect(tasks.length).toBe(1);
      expect(tasks[0].goalId).toBeNull();
    });
  });
});