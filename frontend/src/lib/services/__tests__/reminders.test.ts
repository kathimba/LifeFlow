import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  getReminders,
  getDueReminders,
  createReminder,
  updateReminder,
  dismissReminder,
  deleteReminder,
} from "../reminders";

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
  await prisma.reminder.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  await prisma.reminder.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.task.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.$disconnect();
});

async function seedTask(title = "Test Task") {
  return prisma.task.create({
    data: { userId: TEST_USER_ID, title },
  });
}

describe("Reminders Service", () => {
  describe("createReminder", () => {
    it("creates a reminder linked to a task", async () => {
      const task = await seedTask();
      const remindAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      const reminder = await createReminder(TEST_USER_ID, {
        taskId: task.id,
        remindAt,
        message: "Don't forget",
      });

      expect(reminder.id).toBeDefined();
      expect(reminder.taskId).toBe(task.id);
      expect(reminder.message).toBe("Don't forget");
      expect(reminder.status).toBe("PENDING");
    });

    it("throws on non-existent task", async () => {
      await expect(
        createReminder(TEST_USER_ID, {
          taskId: "00000000-0000-0000-0000-000000000000",
          remindAt: new Date().toISOString(),
        })
      ).rejects.toThrow("Task not found");
    });
  });

  describe("getReminders", () => {
    it("returns reminders for user", async () => {
      const task = await seedTask();
      await createReminder(TEST_USER_ID, {
        taskId: task.id,
        remindAt: new Date().toISOString(),
      });

      const reminders = await getReminders(TEST_USER_ID);
      expect(reminders.length).toBe(1);
      expect(reminders[0].task).toBeDefined();
      expect(reminders[0].task!.title).toBe("Test Task");
    });

    it("filters by status", async () => {
      const task = await seedTask();
      const r = await createReminder(TEST_USER_ID, {
        taskId: task.id,
        remindAt: new Date().toISOString(),
      });
      await dismissReminder(TEST_USER_ID, r.id);

      const pending = await getReminders(TEST_USER_ID, { status: "PENDING" });
      expect(pending.length).toBe(0);

      const dismissed = await getReminders(TEST_USER_ID, { status: "DISMISSED" });
      expect(dismissed.length).toBe(1);
    });
  });

  describe("getDueReminders", () => {
    it("returns only due reminders", async () => {
      const task = await seedTask();
      // Past reminder
      await prisma.reminder.create({
        data: {
          userId: TEST_USER_ID,
          taskId: task.id,
          remindAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      });
      // Future reminder
      await prisma.reminder.create({
        data: {
          userId: TEST_USER_ID,
          taskId: task.id,
          remindAt: new Date(Date.now() + 3600000),
        },
      });

      const due = await getDueReminders(TEST_USER_ID);
      expect(due.length).toBe(1);
    });
  });

  describe("dismissReminder", () => {
    it("sets status to DISMISSED", async () => {
      const task = await seedTask();
      const r = await createReminder(TEST_USER_ID, {
        taskId: task.id,
        remindAt: new Date().toISOString(),
      });

      const dismissed = await dismissReminder(TEST_USER_ID, r.id);
      expect(dismissed.status).toBe("DISMISSED");
    });
  });

  describe("deleteReminder", () => {
    it("deletes the reminder", async () => {
      const task = await seedTask();
      const r = await createReminder(TEST_USER_ID, {
        taskId: task.id,
        remindAt: new Date().toISOString(),
      });

      await deleteReminder(TEST_USER_ID, r.id);
      const reminders = await getReminders(TEST_USER_ID);
      expect(reminders.length).toBe(0);
    });
  });
});