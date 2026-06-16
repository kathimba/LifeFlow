"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useGoals, useTasks, type Task } from "@/lib/store"

const NO_GOAL = "__none__"

export function TaskModal({
  open,
  onOpenChange,
  defaultTitle = "",
  defaultGoalId = null,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultTitle?: string
  defaultGoalId?: string | null
  onCreated?: (task: Task) => void
}) {
  const { createTask } = useTasks()
  const { goals } = useGoals()

  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date())
  const [priority, setPriority] = useState<number>(3) // 1=urgent .. 5=someday, matches DB directly
  const [goalId, setGoalId] = useState<string>(defaultGoalId ?? NO_GOAL)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setTitle(defaultTitle)
        setDescription("")
        setDueDate(new Date())
        setPriority(3)
        setGoalId(defaultGoalId ?? NO_GOAL)
      })
    }
  }, [open, defaultTitle, defaultGoalId])

  const submit = async () => {
    const v = title.trim()
    if (!v || submitting) return
    setSubmitting(true)
    try {
      const task = await createTask({
        title: v,
        description: description.trim() || undefined,
        goalId: goalId === NO_GOAL ? null : goalId,
        dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        priority,
      })
      onCreated?.(task)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription className="sr-only">
            Create a task and link it to a goal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium">Title</label>
            <Input
              autoFocus
              placeholder="What needs doing?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit()
                else if (e.key === "Enter" && !e.shiftKey) submit()
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Description</label>
            <Textarea
              placeholder="Add details (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Due date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left text-xs font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Priority</label>
              <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">P1 — Urgent</SelectItem>
                  <SelectItem value="2">P2 — High</SelectItem>
                  <SelectItem value="3">P3 — Normal</SelectItem>
                  <SelectItem value="4">P4 — Low</SelectItem>
                  <SelectItem value="5">P5 — Someday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">Link to goal</label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger><SelectValue placeholder="No goal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GOAL}>No goal</SelectItem>
                {goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Press <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">Enter</kbd> to save.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? "Creating…" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
