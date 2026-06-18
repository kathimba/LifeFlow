import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  recalculateGoalProgress,
} from "../tasks";
import { createGoal } from "../goals";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const TEST_USER_ID = randomUUID();

beforeAll(async () => {
  // Ensure test user exists
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
  // Clean up before each test
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("Tasks Service", () => {
  describe("createTask", () => {
    it("creates a task with minimum fields", async () => {
      const task = await createTask(TEST_USER_ID, {
        title: "Test task",
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe("Test task");
      expect(task.priority).toBe(3); // default
      expect(task.status).toBe("TODO");
    });

    it("creates a task with all fields", async () => {
      const task = await createTask(TEST_USER_ID, {
        title: "Full task",
        description: "Description",
        priority: 1,
        dueDate: "2026-12-31",
      });

      expect(task.title).toBe("Full task");
      expect(task.description).toBe("Description");
      expect(task.priority).toBe(1);
      expect(task.dueDate).toBeInstanceOf(Date);
    });

    it("creates a task linked to a goal and recalculates progress", async () => {
      const goal = await createGoal(TEST_USER_ID, {
        title: "Test goal",
      });

      const task = await createTask(TEST_USER_ID, {
        title: "Linked task",
        goalId: goal.id,
      });

      expect(task.goalId).toBe(goal.id);

      // Verify goal progress is still 0 (no tasks done)
      const updatedGoal = await prisma.goal.findUnique({
        where: { id: goal.id },
      });
      expect(updatedGoal?.progress).toBe(0);
    });
  });

  describe("getTasks", () => {
    it("returns tasks for a user", async () => {
      await createTask(TEST_USER_ID, { title: "Task 1" });
      await createTask(TEST_USER_ID, { title: "Task 2" });

      const tasks = await getTasks(TEST_USER_ID);
      expect(tasks.length).toBe(2);
    });

    it("filters by goalId", async () => {
      const goal = await createGoal(TEST_USER_ID, { title: "Goal" });
      await createTask(TEST_USER_ID, { title: "Linked", goalId: goal.id });
      await createTask(TEST_USER_ID, { title: "Unlinked" });

      const tasks = await getTasks(TEST_USER_ID, { goalId: goal.id });
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe("Linked");
    });

    it("returns empty array for user with no tasks", async () => {
      const tasks = await getTasks(TEST_USER_ID);
      expect(tasks.length).toBe(0);
    });
  });

  describe("updateTask", () => {
    it("updates task fields", async () => {
      const task = await createTask(TEST_USER_ID, { title: "Original" });

      const updated = await updateTask(TEST_USER_ID, task.id, {
        title: "Updated",
        priority: 2,
      });

      expect(updated.title).toBe("Updated");
      expect(updated.priority).toBe(2);
    });

    it("sets completedAt when moving to DONE", async () => {
      const task = await createTask(TEST_USER_ID, { title: "To complete" });

      const updated = await updateTask(TEST_USER_ID, task.id, {
        status: "DONE",
      });

      expect(updated.status).toBe("DONE");
      expect(updated.completedAt).toBeInstanceOf(Date);
    });

    it("clears completedAt when moving from DONE to TODO", async () => {
      const task = await createTask(TEST_USER_ID, { title: "Undone" });
      await updateTask(TEST_USER_ID, task.id, { status: "DONE" });

      const updated = await updateTask(TEST_USER_ID, task.id, {
        status: "TODO",
      });

      expect(updated.status).toBe("TODO");
      expect(updated.completedAt).toBeNull();
    });

    it("recalculates goal progress on status change", async () => {
      const goal = await createGoal(TEST_USER_ID, { title: "Progress goal" });
      await createTask(TEST_USER_ID, {
        title: "Task 1",
        goalId: goal.id,
      });
      const task2 = await createTask(TEST_USER_ID, {
        title: "Task 2",
        goalId: goal.id,
      });

      // Complete one task — progress should be 50%
      await updateTask(TEST_USER_ID, task2.id, { status: "DONE" });

      const updatedGoal = await prisma.goal.findUnique({
        where: { id: goal.id },
      });
      expect(updatedGoal?.progress).toBe(50);
    });

    it("throws on non-existent task", async () => {
      await expect(
        updateTask(TEST_USER_ID, "00000000-0000-0000-0000-000000000000", { title: "Nope" })
      ).rejects.toThrow("Task not found");
    });
  });

  describe("deleteTask", () => {
    it("deletes a task", async () => {
      const task = await createTask(TEST_USER_ID, { title: "Delete me" });

      const result = await deleteTask(TEST_USER_ID, task.id);
      expect(result.success).toBe(true);

      const tasks = await getTasks(TEST_USER_ID);
      expect(tasks.length).toBe(0);
    });

    it("recalculates goal progress after deletion", async () => {
      const goal = await createGoal(TEST_USER_ID, { title: "Goal" });
      const task = await createTask(TEST_USER_ID, {
        title: "Solo task",
        goalId: goal.id,
      });

      await deleteTask(TEST_USER_ID, task.id);

      const updatedGoal = await prisma.goal.findUnique({
        where: { id: goal.id },
      });
      expect(updatedGoal?.progress).toBe(0);
    });

    it("throws on non-existent task", async () => {
      await expect(
        deleteTask(TEST_USER_ID, "00000000-0000-0000-0000-000000000000")
      ).rejects.toThrow("Task not found");
    });
  });
});