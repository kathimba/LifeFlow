"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Flame, CheckCircle2, Circle, Zap, Calendar, Sparkles } from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TaskModal } from "@/components/task-modal"
import { PriorityBadge } from "@/components/priority-badge"
import { useTasks, useGoals, todayISO, addDays } from "@/lib/store"
import { GoalInsights } from "@/components/goal-insights"
import { DailyFocusCard } from "@/components/daily-focus"
import { PresetTasksDialog } from "@/components/preset-tasks-dialog"

function parseQuickCapture(input: string): { title: string; dueDate: string | null; priority: number } {
  let title = input.trim()
  let dueDate: string | null = todayISO()
  let priority = 3
  const lower = title.toLowerCase()

  if (/\bp1\b|urgent|asap|critical/.test(lower)) { priority = 1; title = title.replace(/\bp1\b|urgent|asap|critical/gi, "").trim() }
  else if (/\bp2\b|high priority|important/.test(lower)) { priority = 2; title = title.replace(/\bp2\b|high priority|important/gi, "").trim() }
  else if (/\bp3\b/.test(lower)) { priority = 3; title = title.replace(/\bp3\b/gi, "").trim() }
  else if (/\bp4\b|low priority|whenever/.test(lower)) { priority = 4; title = title.replace(/\bp4\b|low priority|whenever/gi, "").trim() }
  else if (/\bp5\b|someday/.test(lower)) { priority = 5; title = title.replace(/\bp5\b|someday/gi, "").trim() }

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
  const [captureInput, setCaptureInput] = useState("")
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [modalDefaultTitle, setModalDefaultTitle] = useState("")
  const [headerText, setHeaderText] = useState({ greeting: "Welcome", date: "" })
  const [presetOpen, setPresetOpen] = useState(false)

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
  const openTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "ARCHIVED")
  const completedToday = tasks.filter((t) => t.status === "DONE" && t.dueDate?.slice(0, 10) === today).length
  const todaysFocus = [...openTasks].sort((a, b) => a.priority - b.priority).slice(0, 5)

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
        
        <DailyFocusCard />

        {/* Quick Capture */}
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
            {[1, 2, 3, 4, 5].map((p) => (
              <button key={p} onClick={() => setCaptureInput((prev) => prev ? `${prev} p${p}` : `p${p}`)} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">+ P{p}</button>
            ))}
            {[{label:"today",value:"today"},{label:"tomorrow",value:"tomorrow"},{label:"next week",value:"next week"}].map((d) => (
              <button key={d.value} onClick={() => setCaptureInput((prev) => prev ? `${prev} ${d.value}` : d.value)} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">+ {d.label}</button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Need ideas?</span>
            <button
              onClick={() => setPresetOpen(true)}
              className="text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline transition-colors"
            >
              Browse Presets Tasks
            </button>
          </div>
        </section>

        {/* Today's Focus */}
        <section className="space-y-4">
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
          {completedToday > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {completedToday} task{completedToday > 1 ? "s" : ""} completed today
            </div>
          )}
        </section>

        <GoalInsights />

        <TaskModal open={taskModalOpen} onOpenChange={setTaskModalOpen} defaultTitle={modalDefaultTitle} onCreated={() => setCaptureInput("")} />
      </div>
      <PresetTasksDialog open={presetOpen} onOpenChange={setPresetOpen} />
    </AppLayout>
  )
}

function GoalBadge({ goal }: { goal?: { title: string } | null }) {
  if (!goal) return null
  return <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{goal.title}</span>
}