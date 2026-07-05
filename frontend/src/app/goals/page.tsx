"use client"

import { useState, useMemo } from "react"
import { Plus, Target, Trash2, Pencil, Link2, X, Flag, ChevronRight } from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { useGoals, useTasks, type Goal } from "@/lib/store"

// priorityWeight 1 (highest) -> 5 (lowest), matches DB directly.
const weightBucket = (w: number): "must" | "should" | "nice" => (w <= 2 ? "must" : w === 3 ? "should" : "nice")

const bucketStyles: Record<string, string> = {
  must: "bg-destructive/10 text-destructive border-destructive/20",
  should: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  nice: "bg-primary/10 text-primary border-primary/20",
}
const bucketAccent: Record<string, string> = {
  must: "bg-destructive", should: "bg-orange-500", nice: "bg-primary",
}
const bucketLabel: Record<string, string> = {
  must: "Must-do", should: "Should-do", nice: "Nice-to-do",
}

export default function GoalsPage() {
  const { goals, createGoal, updateGoal, deleteGoal } = useGoals()
  const { tasks, updateTask, createTask } = useTasks()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [linkingGoalId, setLinkingGoalId] = useState<string | null>(null)

  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createPriorityWeight, setCreatePriorityWeight] = useState(3)
  const [createParentGoalId, setCreateParentGoalId] = useState<string | null>(null)

  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriorityWeight, setEditPriorityWeight] = useState(3)
  const [editParentGoalId, setEditParentGoalId] = useState<string | null>(null)

  const [subGoalParentId, setSubGoalParentId] = useState<string | null>(null)
  const [subGoalTitle, setSubGoalTitle] = useState("")
  const [subGoalPriorityWeight, setSubGoalPriorityWeight] = useState(3)

  const [quickTaskGoalId, setQuickTaskGoalId] = useState<string | null>(null)
  const [quickTaskTitle, setQuickTaskTitle] = useState("")
  const [quickTaskPriority, setQuickTaskPriority] = useState(3)
  const [quickTaskDueDate, setQuickTaskDueDate] = useState<string>("")

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("")
  const [deleteIsSubGoal, setDeleteIsSubGoal] = useState(false)

  const eligibleParents = useMemo(() => goals.filter(g => !g.parentGoalId), [goals])

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if (a.priorityWeight !== b.priorityWeight) return a.priorityWeight - b.priorityWeight
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [goals])

  const resetCreate = () => {
    setCreateTitle("")
    setCreateDescription("")
    setCreatePriorityWeight(3)
    setCreateParentGoalId(null)
  }

  const addGoal = async () => {
    const v = createTitle.trim()
    if (!v) return
    await createGoal({
      title: v,
      description: createDescription.trim() || undefined,
      priorityWeight: createPriorityWeight,
      parentGoalId: createParentGoalId,
    })
    resetCreate()
    setCreateOpen(false)
  }

  const addSubGoal = async () => {
    const v = subGoalTitle.trim()
    if (!v || !subGoalParentId) return
    await createGoal({
      title: v,
      priorityWeight: subGoalPriorityWeight,
      parentGoalId: subGoalParentId,
    })
    setSubGoalParentId(null)
    setSubGoalTitle("")
    setSubGoalPriorityWeight(3)
  }

  const submitEdit = async () => {
    if (!editingGoal) return
    const v = editTitle.trim()
    if (!v) return
    await updateGoal(editingGoal.id, {
      title: v,
      description: editDescription.trim() || undefined,
      priorityWeight: editPriorityWeight,
    })
    setEditingGoal(null)
  }

  const removeGoal = async (id: string) => {
    await deleteGoal(id)
  }

  const confirmDelete = (g: Goal, isSub: boolean) => {
    setDeleteConfirmId(g.id)
    setDeleteConfirmTitle(g.title)
    setDeleteIsSubGoal(isSub)
  }

  const executeDelete = async () => {
    if (!deleteConfirmId) return
    await removeGoal(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  const startEdit = (g: Goal) => {
    setEditingGoal(g)
    setEditTitle(g.title)
    setEditDescription(g.description ?? "")
    setEditPriorityWeight(g.priorityWeight)
  }

  const toggleTaskDone = (taskId: string, currentStatus: string) => {
    updateTask(taskId, { status: currentStatus === "DONE" ? "TODO" : "DONE" })
  }

  const resetQuickTask = () => {
    setQuickTaskGoalId(null)
    setQuickTaskTitle("")
    setQuickTaskPriority(3)
    setQuickTaskDueDate("")
  }

  const addQuickTask = async () => {
    const v = quickTaskTitle.trim()
    if (!v || !quickTaskGoalId) return
    await createTask({
      title: v,
      goalId: quickTaskGoalId,
      priority: quickTaskPriority,
      dueDate: quickTaskDueDate || undefined,
    })
    resetQuickTask()
  }

  const unlinkTask = (taskId: string) => updateTask(taskId, { goalId: null })
  const linkTaskToGoal = (taskId: string, goalId: string) => {
    updateTask(taskId, { goalId })
    setLinkingGoalId(null)
  }

  const unlinkedTasks = useMemo(() => tasks.filter((t) => !t.goalId && t.status !== "DONE"), [tasks])

  const renderGoalCard = (g: Goal, isSubGoal = false) => {
    const linked = tasks.filter((t) => t.goalId === g.id && t.status !== "DONE")
    const done = linked.filter((t) => t.status === "DONE").length
    const total = linked.length
    const pct = g.progress ?? 0
    const bucket = weightBucket(g.priorityWeight)
    const subGoals = g.subGoals || []

    return (
      <div key={g.id} className={cn("space-y-4", isSubGoal && "ml-6 border-l-2 border-border pl-4")}>
        <AccordionItem value={g.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/30 transition-colors [&[data-state=open]>svg]:rotate-180">
            <div className="flex w-full items-center gap-4 pr-4">
              <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", bucketAccent[bucket])} />
              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold">{g.title}</h3>
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", bucketStyles[bucket])}>
                    {bucketLabel[bucket]}
                  </span>
                </div>
                {g.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{g.description}</p>}
              </div>
              <div className="hidden shrink-0 sm:block text-right">
                <div className="text-xs font-medium">{pct}%</div>
                <div className="text-[10px] text-muted-foreground">{done}/{total} tasks</div>
              </div>
              <div className="hidden w-24 shrink-0 md:block">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full transition-all", bucketAccent[bucket])} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border">
            <div className="space-y-5 p-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Progress</span>
                  <span className="text-xs font-semibold">{done} of {total} tasks completed</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full transition-all", bucketAccent[bucket])} style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Sub‑goals (interactive) */}
              {subGoals.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sub‑goals</h4>
                  <div className="space-y-3">
                    {subGoals.map(sub => {
                      const subLinked = tasks.filter(t => t.goalId === sub.id && t.status !== "DONE")
                      const subDone = subLinked.filter(t => t.status === "DONE").length
                      const subPct = sub.progress ?? 0
                      return (
                        <AccordionItem key={sub.id} value={sub.id} className="rounded-lg border border-border bg-secondary/10 overflow-hidden">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/20 group [&[data-state=open]>svg]:rotate-180">
                            <div className="flex items-center gap-3 w-full">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              <div className="min-w-0 flex-1 text-left">
                                <div className="text-sm font-medium truncate">{sub.title}</div>
                                <div className="text-[10px] text-muted-foreground">{subDone}/{subLinked.length} tasks · {subPct}%</div>
                              </div>
                              <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className={cn("h-full rounded-full", bucketAccent[weightBucket(sub.priorityWeight)])} style={{ width: `${subPct}%` }} />
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span
                                  onClick={(e) => { e.stopPropagation(); startEdit(sub) }}
                                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground cursor-pointer"
                                  title="Edit"
                                >
                                  <Pencil className="h-3 w-3" />
                                </span>
                                <span
                                  onClick={(e) => { e.stopPropagation(); confirmDelete(sub, true) }}
                                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-t border-border px-4 py-3">
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tasks</span>
                                <div className="flex items-center gap-1">
                                  {quickTaskGoalId === sub.id ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                                      <Input autoFocus placeholder="Task title..." value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addQuickTask(); if (e.key === "Escape") resetQuickTask() }} className="h-8 flex-1 text-xs" />
                                      <Input type="date" value={quickTaskDueDate} onChange={(e) => setQuickTaskDueDate(e.target.value)} className="h-8 w-36 text-xs" />
                                      <Select value={String(quickTaskPriority)} onValueChange={(v) => setQuickTaskPriority(Number(v))}>
                                        <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1">P1</SelectItem><SelectItem value="2">P2</SelectItem><SelectItem value="3">P3</SelectItem><SelectItem value="4">P4</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button size="sm" className="h-8 text-xs" onClick={addQuickTask}>Add</Button>
                                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetQuickTask}><X className="h-3 w-3" /></Button>
                                    </div>
                                  ) : (
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setQuickTaskGoalId(sub.id) }}><Plus className="mr-1 h-3 w-3" />Add task</Button>
                                  )}
                                  {linkingGoalId === sub.id ? (
                                    <div className="flex items-center gap-2">
                                      <Select onValueChange={(v) => linkTaskToGoal(v, sub.id)}>
                                        <SelectTrigger className="h-7 w-44 text-xs"><SelectValue placeholder="Select a task…" /></SelectTrigger>
                                        <SelectContent>
                                          {unlinkedTasks.length === 0 ? <SelectItem value="__none__" disabled>No unlinked tasks</SelectItem> : unlinkedTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      <button onClick={() => setLinkingGoalId(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                                    </div>
                                  ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setLinkingGoalId(sub.id) }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><Link2 className="h-3 w-3" />Link task</button>
                                  )}
                                </div>
                              </div>
                              {subLinked.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border bg-secondary/20 py-4 text-center"><p className="text-[11px] text-muted-foreground">No tasks linked. Link existing tasks above.</p></div>
                              ) : (
                                <ul className="divide-y divide-border rounded-lg border border-border">
                                  {subLinked.map((t) => (
                                    <li key={t.id} className="group flex items-center gap-3 px-3 py-2">
                                      <Checkbox checked={t.status === "DONE"} onCheckedChange={() => toggleTaskDone(t.id, t.status)} className="shrink-0" />
                                      <div className="min-w-0 flex-1"><span className={cn("text-xs", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</span></div>
                                      <button onClick={(e) => { e.stopPropagation(); unlinkTask(t.id) }} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100" title="Unlink task"><X className="h-3 w-3" /></button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quick add sub-goal */}
              {subGoalParentId === g.id ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                  <Input autoFocus placeholder="Sub-goal title..." value={subGoalTitle} onChange={(e) => setSubGoalTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addSubGoal(); if (e.key === "Escape") setSubGoalParentId(null) }} className="h-8 text-xs" />
                  <Select value={String(subGoalPriorityWeight)} onValueChange={(v) => setSubGoalPriorityWeight(Number(v))}>
                    <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Must-do</SelectItem><SelectItem value="3">Should-do</SelectItem><SelectItem value="5">Nice-to-do</SelectItem></SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 text-xs" onClick={addSubGoal}>Add</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSubGoalParentId(null)}><X className="h-3 w-3" /></Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setSubGoalParentId(g.id) }}><Plus className="mr-1 h-3 w-3" />Add sub-goal</Button>
              )}

              {/* Linked tasks */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tasks</span>
                  <div className="flex items-center gap-1">
                    {quickTaskGoalId === g.id ? (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                        <Input autoFocus placeholder="Task title..." value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addQuickTask(); if (e.key === "Escape") resetQuickTask() }} className="h-8 flex-1 text-xs" />
                        <Input type="date" value={quickTaskDueDate} onChange={(e) => setQuickTaskDueDate(e.target.value)} className="h-8 w-36 text-xs" />
                        <Select value={String(quickTaskPriority)} onValueChange={(v) => setQuickTaskPriority(Number(v))}>
                          <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="1">P1</SelectItem><SelectItem value="2">P2</SelectItem><SelectItem value="3">P3</SelectItem><SelectItem value="4">P4</SelectItem></SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 text-xs" onClick={addQuickTask}>Add</Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={resetQuickTask}><X className="h-3 w-3" /></Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setQuickTaskGoalId(g.id) }}><Plus className="mr-1 h-3 w-3" />Add task</Button>
                    )}
                    {linkingGoalId === g.id ? (
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(v) => linkTaskToGoal(v, g.id)}>
                          <SelectTrigger className="h-7 w-48 text-xs"><SelectValue placeholder="Select a task…" /></SelectTrigger>
                          <SelectContent>
                            {unlinkedTasks.length === 0 ? <SelectItem value="__none__" disabled>No unlinked tasks</SelectItem> : unlinkedTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button onClick={() => setLinkingGoalId(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setLinkingGoalId(g.id) }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><Link2 className="h-3 w-3" />Link task</button>
                    )}
                  </div>
                </div>

                {linked.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/20 py-6 text-center"><p className="text-xs text-muted-foreground">No tasks linked yet. Add tasks from the Tasks page, or link existing ones above.</p></div>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {linked.map((t) => (
                      <li key={t.id} className="group flex items-center gap-3 px-3 py-2.5">
                        <Checkbox checked={t.status === "DONE"} onCheckedChange={() => toggleTaskDone(t.id, t.status)} className="shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className={cn("text-sm", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</span>
                          {t.dueDate && <span className="ml-2 text-[10px] text-muted-foreground">{t.dueDate.slice(0, 10)}</span>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); unlinkTask(t.id) }} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100" title="Unlink task"><X className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); startEdit(g) }}>
                  <Pencil className="mr-1.5 h-3 w-3" />Edit
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); confirmDelete(g, false) }}>
                  <Trash2 className="mr-1.5 h-3 w-3" />Delete
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title="Goals"
          description="The why behind your tasks. Keep them few, keep them clear."
          actions={<Button onClick={() => { resetCreate(); setCreateOpen(true) }}><Plus className="h-4 w-4" />New goal</Button>}
        />

        <div className="space-y-4">
          {sortedGoals.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <Target className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">No goals yet. Start with one direction that matters.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {sortedGoals.map(g => renderGoalCard(g))}
            </Accordion>
          )}
        </div>

        {/* Create Goal Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="mb-1.5 block text-xs font-medium">Title</label><Input placeholder="What are you working toward?" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">Description</label><Textarea placeholder="Why does this matter? (optional)" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} rows={3} /></div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Priority</label>
                <Select value={String(createPriorityWeight)} onValueChange={(v) => setCreatePriorityWeight(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1"><span className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-destructive" />Must-do</span></SelectItem>
                    <SelectItem value="3"><span className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-orange-500" />Should-do</span></SelectItem>
                    <SelectItem value="5"><span className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-primary" />Nice-to-do</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Parent goal (optional)</label>
                <Select value={createParentGoalId ?? "__none__"} onValueChange={(v) => setCreateParentGoalId(v === "__none__" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="None (top-level goal)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (top-level goal)</SelectItem>
                    {eligibleParents.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={addGoal} disabled={!createTitle.trim()}>Create goal</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Goal Dialog */}
        <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><label className="mb-1.5 block text-xs font-medium">Title</label><Input placeholder="Goal title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitEdit()} /></div>
              <div><label className="mb-1.5 block text-xs font-medium">Description</label><Textarea placeholder="Why does this matter?" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} /></div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Priority</label>
                <Select value={String(editPriorityWeight)} onValueChange={(v) => setEditPriorityWeight(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1"><span className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-destructive" />Must-do</span></SelectItem>
                    <SelectItem value="3"><span className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-orange-500" />Should-do</span></SelectItem>
                    <SelectItem value="5"><span className="flex items-center gap-2"><Flag className="h-3.5 w-3.5 text-primary" />Nice-to-do</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingGoal?.parentGoalId && (
                <p className="text-xs text-muted-foreground">This is a sub‑goal of another goal. Parent linkage cannot be changed here.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingGoal(null)}>Cancel</Button>
              <Button onClick={submitEdit} disabled={!editTitle.trim()}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete goal?</DialogTitle>
              <DialogDescription>
                This will permanently delete <strong>{deleteConfirmTitle}</strong>.
                {deleteIsSubGoal ? "" : " Any sub-goals under it will also be deleted."}
                {" "}Tasks linked to this goal will be unlinked but not deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={executeDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}