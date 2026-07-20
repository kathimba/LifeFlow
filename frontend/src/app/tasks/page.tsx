"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Plus, Trash2, Calendar as CalendarIcon, Target,
  CheckCircle2, Circle, Clock, ListFilter, Sparkles, Filter
} from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { TaskModal } from "@/components/task-modal"
import { PriorityBadge } from "@/components/priority-badge"
import { useGoals, useTasks, todayISO, addDays, priorityLabel, type Task, type TaskStatus } from "@/lib/store"
import { RecommendedTask } from "@/components/recommended-task"
import { PresetTasksDialog } from "@/components/preset-tasks-dialog"

type FilterTab = "all" | "today" | "upcoming" | "overdue" | "by-goal"
type GroupBy = "none" | "priority" | "due-date"
type StatusFilter = "all" | "pending" | "in-progress" | "completed"

const statusLabel: Record<TaskStatus, string> = {
  TODO: "Todo", IN_PROGRESS: "In Progress", DONE: "Done", ARCHIVED: "Archived",
}
const statusIcon: Record<TaskStatus, typeof Circle> = {
  TODO: Circle, IN_PROGRESS: Clock, DONE: CheckCircle2, ARCHIVED: Circle,
}

export default function TasksPage() {
  const { tasks, updateTask, deleteTask } = useTasks()
  const { goals } = useGoals()
  const [filter, setFilter] = useState<FilterTab>("today")
  const [groupBy, setGroupBy] = useState<GroupBy>("priority")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("completed")
  const [modalOpen, setModalOpen] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)

  const [dateCtx, setDateCtx] = useState<{ today: string; tomorrow: string; weekStart: string; weekEnd: string } | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      const today = todayISO()
      const d = new Date()
      const dayOfWeek = (d.getDay() + 6) % 7
      const ws = addDays(today, -dayOfWeek)
      setDateCtx({ today, tomorrow: addDays(today, 1), weekStart: ws, weekEnd: addDays(ws, 6) })
    })
  }, [])

  const dateOnly = (t: Task) => t.dueDate?.slice(0, 10) ?? null

  const filteredTasks = useMemo(() => {
    if (!dateCtx) {
      return filter === "all" ? tasks : tasks.filter((t) => t.status !== "DONE")
    }
    let result = tasks.filter((t) => {
      const due = dateOnly(t)
      if (filter === "all") return true
      if (filter === "today") return due === dateCtx.today
      if (filter === "upcoming") return due && due > dateCtx.today && t.status !== "DONE"
      if (filter === "overdue") return due && due < dateCtx.today && t.status !== "DONE"
      if (filter === "by-goal") return true
      return true
    })

    // Apply status filter when in by-goal mode
    if (filter === "by-goal" && statusFilter !== "all") {
      if (statusFilter === "pending") result = result.filter((t) => t.status === "TODO")
      else if (statusFilter === "in-progress") result = result.filter((t) => t.status === "IN_PROGRESS")
      else if (statusFilter === "completed") result = result.filter((t) => t.status === "DONE")
    }

    return result
  }, [tasks, filter, dateCtx, statusFilter])

  const groupedTasks = useMemo(() => {
    if (groupBy === "none") return { "": filteredTasks }
    if (groupBy === "priority") {
      const groups: Record<string, typeof filteredTasks> = {}
      for (const p of [1, 2, 3, 4, 5]) {
        const items = filteredTasks.filter((t) => t.priority === p)
        if (items.length) groups[String(p)] = items
      }
      return groups
    }
    if (groupBy === "due-date") {
      const groups: Record<string, typeof filteredTasks> = {}
      const todayList = dateCtx ? filteredTasks.filter((t) => dateOnly(t) === dateCtx.today) : []
      const tomorrowList = dateCtx ? filteredTasks.filter((t) => dateOnly(t) === dateCtx.tomorrow) : []
      const thisWeekList = dateCtx ? filteredTasks.filter((t) => {
        const due = dateOnly(t)
        if (!due || due === dateCtx.today || due === dateCtx.tomorrow) return false
        return due >= dateCtx.weekStart && due <= dateCtx.weekEnd
      }) : []
      const laterList = dateCtx ? filteredTasks.filter((t) => {
        const due = dateOnly(t)
        if (!due) return false
        return due !== dateCtx.today && due !== dateCtx.tomorrow && (due < dateCtx.weekStart || due > dateCtx.weekEnd)
      }) : []
      const noDateList = filteredTasks.filter((t) => !dateOnly(t))
      if (todayList.length) groups["Today"] = todayList
      if (tomorrowList.length) groups["Tomorrow"] = tomorrowList
      if (thisWeekList.length) groups["This Week"] = thisWeekList
      if (laterList.length) groups["Later"] = laterList
      if (noDateList.length) groups["No Date"] = noDateList
      return groups
    }
    return { "": filteredTasks }
  }, [filteredTasks, groupBy, dateCtx])

  const byGoalGroups = useMemo(() => {
    if (filter !== "by-goal") return null

    const allGoals: { id: string; title: string }[] = []
    for (const g of goals) {
      allGoals.push({ id: g.id, title: g.title })
      if (g.subGoals) {
        for (const sub of g.subGoals) {
          allGoals.push({ id: sub.id, title: `↳ ${sub.title}` })
        }
      }
    }

    const sortByDate = (a: Task, b: Task) => {
      const da = dateOnly(a)
      const db = dateOnly(b)
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return db.localeCompare(da) // newest first
    }

    const groups: Record<string, typeof filteredTasks> = {}
    const assigned = new Set<string>()

    for (const goal of allGoals) {
      const items = filteredTasks
        .filter((t) => t.goalId === goal.id)
        .sort(sortByDate)
      if (items.length > 0) {
        groups[goal.title] = items
        items.forEach((t) => assigned.add(t.id))
      }
    }

    const noGoal = filteredTasks
      .filter((t) => !t.goalId && !assigned.has(t.id))
      .sort(sortByDate)
    if (noGoal.length) groups["No Goal"] = noGoal

    return groups
  }, [filteredTasks, filter, goals])

  const toggleTask = (t: Task) => updateTask(t.id, { status: t.status === "DONE" ? "TODO" : "DONE" })
  const setTaskStatus = (id: string, status: TaskStatus) => updateTask(id, { status })
  const remove = (id: string) => deleteTask(id)

  const groupsToRender = filter === "by-goal" ? byGoalGroups : groupedTasks

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          description="One small step at a time, all tied back to a goal."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPresetOpen(true)}>
                <Sparkles className="h-4 w-4" /> Discover
              </Button>
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" /> Add task
              </Button>
            </div>
          }
        />

        <RecommendedTask />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
            {([
              {key:"overdue",label:"Overdue"},
              {key:"today",label:"Today"},
              {key:"upcoming",label:"Upcoming"},
              {key:"by-goal",label:"By Goal"},
              {key:"all",label:"All"}] as {key:FilterTab;label:string}[]).map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={cn("rounded-md px-3 py-1.5 whitespace-nowrap capitalize transition-colors", filter === f.key ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>{f.label}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {filter === "by-goal" && (
              <div className="flex items-center gap-2 text-xs">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Status</span>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {([
                    { key: "completed", label: "Completed" },
                    { key: "pending", label: "Pending" },
                    { key: "in-progress", label: "In Progress" },
                    { key: "all", label: "All" },
                  ] as { key: StatusFilter; label: string }[]).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setStatusFilter(s.key)}
                      className={cn(
                        "px-2.5 py-1 transition-colors",
                        statusFilter === s.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {filter !== "by-goal" && (
              <div className="flex items-center gap-2 text-xs">
                <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Group by</span>
                <div className="flex rounded-md border border-border overflow-hidden">
                  {([{key:"none",label:"None"},{key:"priority",label:"Priority"},{key:"due-date",label:"Due Date"}] as {key:GroupBy;label:string}[]).map((g) => (
                    <button key={g.key} onClick={() => setGroupBy(g.key)} className={cn("px-2.5 py-1 transition-colors", groupBy === g.key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>{g.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {groupsToRender && Object.entries(groupsToRender).length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">Nothing here. A clear list is a calm mind.</div>
          ) : (
            groupsToRender && Object.entries(groupsToRender).map(([groupName, items]) => (
              <section key={groupName || "all"}>
                {groupName && (
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {filter === "by-goal" ? <span className="flex items-center gap-1.5"><Target className="h-3 w-3" />{groupName}</span>
                      : groupBy === "priority" ? priorityLabel(Number(groupName)) : groupName}
                  </h3>
                )}
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {items.map((t) => {
                    const due = dateOnly(t)
                    const StatusIcon = statusIcon[t.status] || Circle
                    return (
                      <li key={t.id} className="group grid grid-cols-[auto_1fr_auto] items-start gap-3 px-4 py-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center">
                        <Checkbox checked={t.status === "DONE"} onCheckedChange={() => toggleTask(t)} className="mt-0.5 sm:mt-0" />
                        <div className="min-w-0">
                          <div className={cn("text-sm", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</div>
                          {t.description && <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.description}</div>}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <PriorityBadge priority={t.priority} size="xs" />
                            {t.goal && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-accent/50 px-2 py-0.5 text-[10px] text-accent-foreground">
                                <Target className="h-2.5 w-2.5" />{t.goal.title}
                              </span>
                            )}
                            {due && (
                              <span className={cn("inline-flex items-center gap-1 text-[10px]", dateCtx && due < dateCtx.today && t.status !== "DONE" ? "text-destructive font-medium" : "text-muted-foreground")}>
                                <CalendarIcon className="h-2.5 w-2.5" />
                                {dateCtx && due === dateCtx.today ? "Today" : dateCtx && due === dateCtx.tomorrow ? "Tomorrow" : due}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><StatusIcon className="h-2.5 w-2.5" />{statusLabel[t.status]}</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Select value={t.status} onValueChange={(v) => setTaskStatus(t.id, v as TaskStatus)}>
                            <SelectTrigger className="h-7 w-[110px] text-xs border-none bg-transparent hover:bg-secondary"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TODO">Todo</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="DONE">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <button onClick={() => remove(t.id)} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100" aria-label="Delete task">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
        <TaskModal open={modalOpen} onOpenChange={setModalOpen} />
        <PresetTasksDialog open={presetOpen} onOpenChange={setPresetOpen} />
      </div>
    </AppLayout>
  )
}