import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createEntry, getEntries, updateEntry, deleteEntry, getEntryById } from "../journal";
import { randomUUID } from "node:crypto";

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
  await prisma.journalEntry.deleteMany({ where: { userId: TEST_USER_ID } });
});

afterAll(async () => {
  await prisma.journalEntry.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("Journal Service", () => {
  describe("createEntry", () => {
    it("creates an entry with content", async () => {
      const entry = await createEntry(TEST_USER_ID, {
        content: "Today was productive",
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.content).toBe("Today was productive");
      expect(entry.userId).toBe(TEST_USER_ID);
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it("creates an entry with mood and energy", async () => {
      const entry = await createEntry(TEST_USER_ID, {
        content: "Feeling good",
        mood: 4,
        energy: 5,
      });

      expect(entry.mood).toBe(4);
      expect(entry.energy).toBe(5);
    });

    it("creates an entry with only mood (no content — allowed by API)", async () => {
      const entry = await createEntry(TEST_USER_ID, {
        content: "",
        mood: 3,
        energy: null,
      });

      expect(entry.mood).toBe(3);
      expect(entry.content).toBe("");
    });

    it("creates an entry with null mood and energy", async () => {
      const entry = await createEntry(TEST_USER_ID, {
        content: "Just a note",
      });

      expect(entry.mood).toBeNull();
      expect(entry.energy).toBeNull();
    });
  });

  describe("getEntries", () => {
    it("returns all entries for a user, newest first", async () => {
      const e1 = await createEntry(TEST_USER_ID, { content: "First" });
      // Small delay to ensure different createdAt timestamps
      await new Promise((r) => setTimeout(r, 10));
      const e2 = await createEntry(TEST_USER_ID, { content: "Second" });

      const entries = await getEntries(TEST_USER_ID);

      expect(entries.length).toBe(2);
      expect(entries[0].id).toBe(e2.id); // newest first
      expect(entries[1].id).toBe(e1.id);
    });

    it("respects the limit option", async () => {
      await createEntry(TEST_USER_ID, { content: "A" });
      await createEntry(TEST_USER_ID, { content: "B" });
      await createEntry(TEST_USER_ID, { content: "C" });

      const entries = await getEntries(TEST_USER_ID, { limit: 2 });

      expect(entries.length).toBe(2);
    });

    it("returns empty array for user with no entries", async () => {
      const entries = await getEntries(TEST_USER_ID);
      expect(entries.length).toBe(0);
    });
  });

  describe("getEntryById", () => {
    it("returns the correct entry", async () => {
      const created = await createEntry(TEST_USER_ID, { content: "Find me" });

      const found = await getEntryById(TEST_USER_ID, created.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(created.id);
      expect(found!.content).toBe("Find me");
    });

    it("returns null for non-existent entry", async () => {
      const found = await getEntryById(TEST_USER_ID, "00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });

    it("returns null for entry belonging to another user", async () => {
      const entry = await createEntry(TEST_USER_ID, { content: "Mine" });

      const found = await getEntryById("00000000-0000-0000-0000-000000000001", entry.id);
      expect(found).toBeNull();
    });
  });

  describe("updateEntry", () => {
    it("updates content", async () => {
      const entry = await createEntry(TEST_USER_ID, { content: "Original" });

      const updated = await updateEntry(TEST_USER_ID, entry.id, {
        content: "Updated",
      });

      expect(updated.content).toBe("Updated");
    });

    it("updates mood and energy", async () => {
      const entry = await createEntry(TEST_USER_ID, {
        content: "Mood swing",
        mood: 2,
        energy: 1,
      });

      const updated = await updateEntry(TEST_USER_ID, entry.id, {
        mood: 5,
        energy: 5,
      });

      expect(updated.mood).toBe(5);
      expect(updated.energy).toBe(5);
    });

    it("throws on non-existent entry", async () => {
      await expect(
        updateEntry(TEST_USER_ID, "00000000-0000-0000-0000-000000000000", { content: "Nope" })
      ).rejects.toThrow("Journal entry not found");
    });
  });

  describe("deleteEntry", () => {
    it("deletes an entry", async () => {
      const entry = await createEntry(TEST_USER_ID, { content: "Delete me" });

      const result = await deleteEntry(TEST_USER_ID, entry.id);
      expect(result.success).toBe(true);

      const entries = await getEntries(TEST_USER_ID);
      expect(entries.length).toBe(0);
    });

    it("throws on non-existent entry", async () => {
      await expect(
        deleteEntry(TEST_USER_ID, "00000000-0000-0000-0000-000000000000")
      ).rejects.toThrow("Journal entry not found");
    });
  });
});