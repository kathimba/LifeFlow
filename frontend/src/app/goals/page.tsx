"use client"

import { useState, useMemo } from "react"
import { Plus, Target, Trash2, Pencil, Link2, X, Flag } from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { useGoals, useTasks, type Goal } from "@/lib/store"

// priorityWeight 1 (highest) -> 5 (lowest), matches DB directly.
// UI buckets 1-2 as "must", 3 as "should", 4-5 as "nice" for styling only.
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
  const { tasks, updateTask } = useTasks()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [linkingGoalId, setLinkingGoalId] = useState<string | null>(null)

  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createPriorityWeight, setCreatePriorityWeight] = useState(3)

  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPriorityWeight, setEditPriorityWeight] = useState(3)

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
  }

  const addGoal = async () => {
    const v = createTitle.trim()
    if (!v) return
    await createGoal({ title: v, description: createDescription.trim() || undefined, priorityWeight: createPriorityWeight })
    resetCreate()
    setCreateOpen(false)
  }

  const submitEdit = async () => {
    if (!editingGoal) return
    const v = editTitle.trim()
    if (!v) return
    await updateGoal(editingGoal.id, { title: v, description: editDescription.trim() || undefined, priorityWeight: editPriorityWeight })
    setEditingGoal(null)
  }

  const removeGoal = async (id: string) => {
    await deleteGoal(id)
    // Tasks linked to this goal are set to goalId: null server-side via SetNull —
    // refetch via the store's event system handles syncing local task state.
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

  const unlinkTask = (taskId: string) => updateTask(taskId, { goalId: null })
  const linkTaskToGoal = (taskId: string, goalId: string) => {
    updateTask(taskId, { goalId })
    setLinkingGoalId(null)
  }

  const unlinkedTasks = useMemo(() => tasks.filter((t) => !t.goalId && t.status !== "DONE"), [tasks])

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
              {sortedGoals.map((g) => {
                const linked = tasks.filter((t) => t.goalId === g.id)
                const done = linked.filter((t) => t.status === "DONE").length
                const total = linked.length
                const pct = g.progress ?? 0 // server is source of truth — never recompute client-side
                const bucket = weightBucket(g.priorityWeight)

                return (
                  <AccordionItem key={g.id} value={g.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
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

                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked tasks</span>
                            {linkingGoalId === g.id ? (
                              <div className="flex items-center gap-2">
                                <Select onValueChange={(v) => linkTaskToGoal(v, g.id)}>
                                  <SelectTrigger className="h-7 w-48 text-xs"><SelectValue placeholder="Select a task…" /></SelectTrigger>
                                  <SelectContent>
                                    {unlinkedTasks.length === 0 ? (
                                      <SelectItem value="__none__" disabled>No unlinked tasks</SelectItem>
                                    ) : unlinkedTasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <button onClick={() => setLinkingGoalId(null)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            ) : (
                              <button onClick={(e) => { e.stopPropagation(); setLinkingGoalId(g.id) }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                                <Link2 className="h-3 w-3" />Link task
                              </button>
                            )}
                          </div>

                          {linked.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-secondary/20 py-6 text-center">
                              <p className="text-xs text-muted-foreground">No tasks linked yet. Add tasks from the Tasks page, or link existing ones above.</p>
                            </div>
                          ) : (
                            <ul className="divide-y divide-border rounded-lg border border-border">
                              {linked.map((t) => (
                                <li key={t.id} className="group flex items-center gap-3 px-3 py-2.5">
                                  <Checkbox checked={t.status === "DONE"} onCheckedChange={() => toggleTaskDone(t.id, t.status)} className="shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <span className={cn("text-sm", t.status === "DONE" && "text-muted-foreground line-through")}>{t.title}</span>
                                    {t.dueDate && <span className="ml-2 text-[10px] text-muted-foreground">{t.dueDate.slice(0, 10)}</span>}
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); unlinkTask(t.id) }} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100" title="Unlink task">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); startEdit(g) }}>
                            <Pencil className="mr-1.5 h-3 w-3" />Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); removeGoal(g.id) }}>
                            <Trash2 className="mr-1.5 h-3 w-3" />Delete
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </div>

        {/* Create Goal Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium">Title</label>
                <Input placeholder="What are you working toward?" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Description</label>
                <Textarea placeholder="Why does this matter? (optional)" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} rows={3} />
              </div>
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
              <div>
                <label className="mb-1.5 block text-xs font-medium">Title</label>
                <Input placeholder="Goal title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitEdit()} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium">Description</label>
                <Textarea placeholder="Why does this matter?" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
              </div>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingGoal(null)}>Cancel</Button>
              <Button onClick={submitEdit} disabled={!editTitle.trim()}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
