// src/lib/store.ts
// Thin fetch wrappers around the real API. DB shape end-to-end —
// no Lovable-compat translation, no diff-based sync.
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useUser } from "@/lib/auth/AuthProvider";

const STORE_CHANGED_EVENT = "lifeflow:store-changed";
const notifyStoreChanged = (scope: "goals" | "tasks" | "logs" | "reminders") => {
  window.dispatchEvent(new CustomEvent(STORE_CHANGED_EVENT, { detail: scope }));
};

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types — exact DB shape, matching the Prisma schema ──────────────────────

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";
export type GoalStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: number; // 1 (urgent) -> 5 (low), matches DB directly
  goalId?: string | null;
  goal?: { id: string; title: string } | null;
  dueDate?: string | null;
  recurrenceRule?: string | null;
  createdAt: string;
  completedAt?: string | null;
};

export type Goal = {
  id: string;
  title: string;
  description?: string | null;
  status: GoalStatus;
  priorityWeight: number; // 1 (highest) -> 5 (lowest), matches DB directly
  progress: number;       // server-calculated, always trust this
  targetDate?: string | null;
  parentGoalId?: string | null;
  createdAt: string;
};

export type LogEntry = {
  id: string;
  content: string;
  mood?: number | null;   // 1-5 scale, matches DB directly
  energy?: number | null;
  createdAt: string;
};

// ─── Priority display helpers (DB int -> label, for UI only) ─────────────────

export const priorityLabel = (p: number): string =>
  ({ 1: "Urgent", 2: "High", 3: "Normal", 4: "Low", 5: "Someday" }[p] ?? "Normal");

export const priorityColor = (p: number): string =>
  ({ 1: "#D85A30", 2: "#BA7517", 3: "#378ADD", 4: "#888780", 5: "#B4B2A9" }[p] ?? "#378ADD");

export const goalStatusLabel = (s: GoalStatus): string =>
  ({ ACTIVE: "Active", PAUSED: "Paused", COMPLETED: "Completed" }[s]);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const addDays = (date: string, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// ─── useGoals ──────────────────────────────────────────────────────────────

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useUser();
  const mounted = useRef(false);

  const refetch = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      if (mounted.current) { setGoals([]); setLoading(false); }
      return;
    }
    try {
      const data = await fetchJson<Goal[]>("/api/goals");
      if (mounted.current) setGoals(data);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => { mounted.current = false; };
  }, [refetch]);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent).detail === "goals") refetch(); };
    window.addEventListener(STORE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(STORE_CHANGED_EVENT, handler);
  }, [refetch]);

  const createGoal = useCallback(
    async (input: { title: string; description?: string; priorityWeight?: number; targetDate?: string | null; parentGoalId?: string | null }) => {
      const goal = await fetchJson<Goal>("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      await refetch();
      notifyStoreChanged("goals");
      return goal;
    },
    [refetch]
  );

  const updateGoal = useCallback(
    async (id: string, patch: Partial<Pick<Goal, "title" | "description" | "status" | "priorityWeight" | "targetDate">>) => {
      // Optimistic local update
      setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
      const goal = await fetchJson<Goal>(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      notifyStoreChanged("goals");
      return goal;
    },
    []
  );

  const deleteGoal = useCallback(async (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetchJson(`/api/goals/${id}`, { method: "DELETE" });
    notifyStoreChanged("goals");
  }, []);

  return { goals, loading, createGoal, updateGoal, deleteGoal, refetch };
};

// ─── useTasks ──────────────────────────────────────────────────────────────

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useUser();
  const mounted = useRef(false);

  const refetch = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      if (mounted.current) { setTasks([]); setLoading(false); }
      return;
    }
    try {
      const data = await fetchJson<Task[]>("/api/tasks");
      if (mounted.current) setTasks(data);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => { mounted.current = false; };
  }, [refetch]);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent).detail === "tasks") refetch(); };
    window.addEventListener(STORE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(STORE_CHANGED_EVENT, handler);
  }, [refetch]);

  const createTask = useCallback(
    async (input: { title: string; description?: string; goalId?: string | null; priority?: number; dueDate?: string | null; recurrenceRule?: string | null }) => {
      const task = await fetchJson<Task>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      await refetch();
      notifyStoreChanged("tasks");
      // Task creation can affect goal progress (new total task count)
      if (input.goalId) notifyStoreChanged("goals");
      return task;
    },
    [refetch]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Pick<Task, "title" | "description" | "status" | "priority" | "dueDate" | "goalId" | "recurrenceRule">>) => {
      // Optimistic local update — instant UI feedback
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      const task = await fetchJson<Task>(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      notifyStoreChanged("tasks");
      // Status changes recalculate goal.progress server-side — re-sync goals
      if (patch.status !== undefined) notifyStoreChanged("goals");
      return task;
    },
    []
  );

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetchJson(`/api/tasks/${id}`, { method: "DELETE" });
    notifyStoreChanged("tasks");
    if (task?.goalId) notifyStoreChanged("goals");
  }, [tasks]);

  return { tasks, loading, createTask, updateTask, deleteTask, refetch };
};

// ─── useLogs ───────────────────────────────────────────────────────────────

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useUser();
  const mounted = useRef(false);

  const refetch = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      if (mounted.current) { setLogs([]); setLoading(false); }
      return;
    }
    try {
      const data = await fetchJson<LogEntry[]>("/api/journal");
      if (mounted.current) setLogs(data);
    } catch {
      // Silently handle auth errors
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [authLoading, user]);

  // Fetch on mount only — no cross-tab sync for journal
  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => { mounted.current = false; };
  }, [refetch]);

  const createLog = useCallback(
    async (input: { content: string; mood?: number | null; energy?: number | null }) => {
      const log = await fetchJson<LogEntry>("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      setLogs((prev) => [log, ...prev]);
      return log;
    },
    []
  );

  const updateLog = useCallback(
    async (id: string, patch: Partial<Pick<LogEntry, "content" | "mood" | "energy">>) => {
      const log = await fetchJson<LogEntry>(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setLogs((prev) => prev.map((l) => (l.id === id ? log : l)));
      return log;
    },
    []
  );

  const deleteLog = useCallback(async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    await fetchJson(`/api/journal/${id}`, { method: "DELETE" });
  }, []);

  return { logs, loading, createLog, updateLog, deleteLog, refetch };
};

// ─── Reminder types ───────────────────────────────────────────────────────

export type Reminder = {
  id: string;
  userId: string;
  taskId: string;
  remindAt: string;
  message?: string | null;
  status: "PENDING" | "SENT" | "DISMISSED";
  createdAt: string;
  task?: { id: string; title: string; dueDate: string | null; status: string };
};

// ─── useReminders ─────────────────────────────────────────────────────────

export const useReminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useUser();
  const mounted = useRef(false);

  const refetch = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      if (mounted.current) { setReminders([]); setLoading(false); }
      return;
    }
    try {
      const data = await fetchJson<Reminder[]>("/api/reminders");
      if (mounted.current) setReminders(data);
    } catch {
      // Silently handle auth errors
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => { mounted.current = false; };
  }, [refetch]);

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent).detail === "reminders") refetch(); };
    window.addEventListener(STORE_CHANGED_EVENT, handler);
    return () => window.removeEventListener(STORE_CHANGED_EVENT, handler);
  }, [refetch]);

  const createReminder = useCallback(
    async (input: { taskId: string; remindAt: string; message?: string }) => {
      const reminder = await fetchJson<Reminder>("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      await refetch();
      notifyStoreChanged("reminders");
      return reminder;
    },
    [refetch]
  );

  const updateReminder = useCallback(
    async (id: string, patch: Partial<Pick<Reminder, "remindAt" | "message" | "status">>) => {
      const reminder = await fetchJson<Reminder>(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setReminders((prev) => prev.map((r) => (r.id === id ? reminder : r)));
      notifyStoreChanged("reminders");
      return reminder;
    },
    []
  );

  const dismissReminder = useCallback(async (id: string) => {
    const reminder = await fetchJson<Reminder>(`/api/reminders/${id}/dismiss`, {
      method: "POST",
    });
    setReminders((prev) => prev.map((r) => (r.id === id ? reminder : r)));
    notifyStoreChanged("reminders");
    return reminder;
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    await fetchJson(`/api/reminders/${id}`, { method: "DELETE" });
    notifyStoreChanged("reminders");
  }, []);

  return { reminders, loading, createReminder, updateReminder, dismissReminder, deleteReminder, refetch };
};
