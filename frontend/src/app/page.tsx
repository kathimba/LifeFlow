"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Flame, Target, CheckCircle2, Circle, Sparkles,
  Zap, Calendar, ArrowRight, Clock, NotebookPen,
} from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TaskModal } from "@/components/task-modal"
import { PriorityBadge } from "@/components/priority-badge"
import { useTasks, useGoals, useLogs, todayISO, addDays } from "@/lib/store"

// Quick capture now returns DB-shaped values directly: priority 1-5, not p1-p4
function parseQuickCapture(input: string): { title: string; dueDate: string | null; priority: number } {
  let title = input.trim()
  let dueDate: string | null = todayISO()
  let priority = 3
  const lower = title.toLowerCase()

  if (/\bp1\b|urgent|asap|critical/.test(lower)) { priority = 1; title = title.replace(/\bp1\b|urgent|asap|critical/gi, "").trim() }
  else if (/\bp2\b|high priority|important/.test(lower)) { priority = 2; title = title.replace(/\bp2\b|high priority|important/gi, "").trim() }
  else if (/\bp3\b/.test(lower)) { priority = 3; title = title.replace(/\bp3\b/gi, "").trim() }
  else if (/\bp4\b|low priority|whenever/.test(lower)) { priority = 4; title = title.replace(/\bp4\b|low priority|whenever/gi, "").trim() }

  const datePatterns = [
    { regex: /\btomorrow\b/, delta: 1 }, { regex: /\btoday\b/, delta: 0 },
    { regex: /\bnext week\b/, delta: 7 }, { regex: /\bin a week\b/, delta: 7 },
    { regex: /\bin 3 days\b/, delta: 3 }, { regex: /\bin 2 days\b/, delta: 2 },
  ]
  for (const { regex, delta } of datePatterns) {
    if (regex.test(lower)) { dueDate = addDays(todayISO(), delta); title = title.replace(regex, "").replace(/\s+/g, " ").trim(); break }
  }
  return { title, dueDate, priority }
}

export default function Dashboard() {
  const { tasks, createTask, updateTask } = useTasks()
  const { goals } = useGoals()
  const { logs } = useLogs()
  const [captureInput, setCaptureInput] = useState("")
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [modalDefaultTitle, setModalDefaultTitle] = useState("")
  const [headerText, setHeaderText] = useState({ greeting: "Welcome", date: "" })

  useEffect(() => {
    queueMicrotask(() => {
      const h = new Date().getHours()
      let greeting = "Good evening"
      if (h < 5) greeting = "Still up?"
      else if (h < 12) greeting = "Good morning"
      else if (h < 18) greeting = "Good afternoon"
      setHeaderText({ greeting, date: new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) })
    })
  }, [])

  const today = todayISO()
  const openTasks = tasks.filter((t) => t.status !== "DONE")
  const completedToday = tasks.filter((t) => t.status === "DONE" && t.dueDate?.slice(0, 10) === today).length
  // Lower priority number = more urgent, so ascending sort surfaces urgent tasks first
  const todaysFocus = [...openTasks].sort((a, b) => a.priority - b.priority).slice(0, 5)
  const recentCompleted = [...tasks]
    .filter((t) => t.status === "DONE")
    .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())
    .slice(0, 5)
  const recentLogs = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3)

  const handleCapture = async () => {
    if (!captureInput.trim()) return
    const parsed = parseQuickCapture(captureInput)
    if (!parsed.title) return
    await createTask({ title: parsed.title, dueDate: parsed.dueDate, priority: parsed.priority })
    setCaptureInput("")
  }

  const toggleTask = async (id: string, currentStatus: string) => {
    await updateTask(id, { status: currentStatus === "DONE" ? "TODO" : "DONE" })
  }

  return (
    <AppLayout>
      <div className="space-y-10">
        <PageHeader title={headerText.greeting} description={headerText.date} />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Zap className="h-4 w-4 text-primary" />Quick Capture
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input placeholder='Try: "Call dentist tomorrow p1" or "Review slides today"' value={captureInput} onChange={(e) => setCaptureInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCapture()} className="flex-1" />
            <Button onClick={handleCapture} className="shrink-0">Capture</Button>
            <Button variant="outline" className="shrink-0" onClick={() => { setModalDefaultTitle(captureInput.trim()); setTaskModalOpen(true) }}>More options</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["p1","p2","p3","p4"].map((p) => (
              <button key={p} onClick={() => setCaptureInput((prev) => prev ? `${prev} ${p}` : p)} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">+ {p.toUpperCase()}</button>
            ))}
            {[{label:"today",value:"today"},{label:"tomorrow",value:"tomorrow"},{label:"next week",value:"next week"}].map((d) => (
              <button key={d.value} onClick={() => setCaptureInput((prev) => prev ? `${prev} ${d.value}` : d.value)} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">+ {d.label}</button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Flame className="h-4 w-4 text-primary" />Today&apos;s Focus
              <Badge variant="secondary" className="ml-auto text-xs">{openTasks.length} open</Badge>
            </div>
            <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">
              {todaysFocus.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No open tasks. You&apos;re either ahead of the game or need to capture what&apos;s next.
                  <div className="mt-2"><Link href="/tasks" className="text-xs font-medium text-primary hover:underline">Go to Tasks →</Link></div>
                </div>
              ) : (
                <ul>
                  {todaysFocus.map((t, i) => {
                    const isDone = t.status === "DONE"
                    const dueDateOnly = t.dueDate?.slice(0, 10)
                    return (
                      <li key={t.id} className={"flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30 " + (i < todaysFocus.length - 1 ? "border-b border-border" : "")}>
                        <button onClick={() => toggleTask(t.id, t.status)} className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary" aria-label="Toggle task">
                          {isDone ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span className={"text-sm font-medium " + (isDone ? "text-muted-foreground line-through" : "")}>{t.title}</span>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <PriorityBadge priority={t.priority} />
                            {dueDateOnly && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{dueDateOnly === today ? "Today" : dueDateOnly === addDays(today, 1) ? "Tomorrow" : dueDateOnly}</span>}
                            {t.goal && <GoalBadge goal={t.goal} />}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            {completedToday > 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{completedToday} task{completedToday > 1 ? "s" : ""} completed today</div>}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Clock className="h-4 w-4 text-primary" />Activity Snapshot</div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recently Completed</h3>
              {recentCompleted.length === 0 ? <p className="text-sm text-muted-foreground">Nothing checked off yet today.</p> : (
                <ul className="space-y-2.5">{recentCompleted.map((t) => <li key={t.id} className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" /><span className="line-through">{t.title}</span></li>)}</ul>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Notes</h3>
                <Link href="/log" className="text-xs text-muted-foreground hover:text-foreground">All →</Link>
              </div>
              {recentLogs.length === 0 ? <p className="text-sm text-muted-foreground">No journal entries yet.</p> : (
                <ul className="space-y-3">{recentLogs.map((l) => {
                  const logDate = l.createdAt.slice(0, 10)
                  return (
                    <li key={l.id}>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><NotebookPen className="h-3 w-3" />{logDate === today ? "Today" : logDate === addDays(today, -1) ? "Yesterday" : logDate}</div>
                      <p className="mt-1 text-sm text-foreground line-clamp-2">{l.content}</p>
                    </li>
                  )
                })}</ul>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Target className="h-4 w-4 text-primary" />Goals Progress</div>
            <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground">Manage goals →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.length === 0 ? <EmptyState message="No goals yet. Start with one meaningful direction." /> : goals.map((g) => {
              const linked = tasks.filter((t) => t.goalId === g.id)
              const done = linked.filter((t) => t.status === "DONE").length
              const pct = g.progress ?? 0  // server is source of truth — never recompute client-side
              return (
                <div key={g.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{g.title}</h3>{g.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.description}</p>}</div>
                    <span className="shrink-0 text-lg font-bold text-primary">{pct}%</span>
                  </div>
                  <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{done} / {linked.length} tasks</span><span>{pct}% done</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Sparkles className="h-4 w-4 text-primary" />Suggested Next Actions</div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Start your top P1 task", body: "You have urgent tasks. Tackling the hardest one first builds momentum.", cta: "View tasks", to: "/tasks" },
              { title: "Write today's log", body: "Journaling helps close mental loops. Even 2 sentences help.", cta: "Open log", to: "/log" },
              { title: "Review goal progress", body: "Check in on your goals. What's the next smallest step?", cta: "See goals", to: "/goals" },
            ].map((s) => (
              <div key={s.title} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary/70" /><h3 className="text-sm font-semibold">{s.title}</h3></div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                <Link href={s.to} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors group-hover:underline">{s.cta}<ArrowRight className="h-3 w-3" /></Link>
              </div>
            ))}
          </div>
        </section>

        <TaskModal open={taskModalOpen} onOpenChange={setTaskModalOpen} defaultTitle={modalDefaultTitle} onCreated={() => setCaptureInput("")} />
      </div>
    </AppLayout>
  )
}

function GoalBadge({ goal }: { goal?: { title: string } | null }) {
  if (!goal) return null
  return <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{goal.title}</span>
}

function EmptyState({ message }: { message: string }) {
  return <div className="col-span-full rounded-2xl border border-dashed border-border bg-card/50 py-10 text-center text-sm text-muted-foreground">{message}</div>
}
