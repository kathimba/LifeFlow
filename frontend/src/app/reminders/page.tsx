"use client"

import { useState } from "react"
import { Bell, Plus, Trash2, Clock, CheckCircle2, X } from "lucide-react"
import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useReminders, useTasks, type Reminder } from "@/lib/store"

export default function RemindersPage() {
  const { reminders, createReminder, updateReminder, dismissReminder, deleteReminder } = useReminders()
  const { tasks } = useTasks()
  const [createOpen, setCreateOpen] = useState(false)
  const [taskId, setTaskId] = useState("")
  const [remindAt, setRemindAt] = useState("")
  const [message, setMessage] = useState("")

  const pending = reminders.filter((r) => r.status === "PENDING")
  const dismissed = reminders.filter((r) => r.status === "DISMISSED" || r.status === "SENT")

  const handleCreate = async () => {
    if (!taskId || !remindAt) return
    await createReminder({ taskId, remindAt: new Date(remindAt).toISOString(), message: message || undefined })
    setCreateOpen(false)
    setTaskId("")
    setRemindAt("")
    setMessage("")
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title="Reminders"
          description="Stay on top of your tasks with timely reminders."
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New reminder
            </Button>
          }
        />

        {/* Pending reminders */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Bell className="h-3.5 w-3.5" /> Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/40 py-8 text-center text-sm text-muted-foreground">
              No pending reminders. Create one to get notified.
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((r) => {
                const isDue = new Date(r.remindAt) <= new Date()
                return (
                  <li key={r.id} className={cn(
                    "flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm",
                    isDue && "border-orange-500/30 bg-orange-500/5"
                  )}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.task?.title ?? "Unknown task"}</p>
                      {r.message && <p className="text-xs text-muted-foreground">{r.message}</p>}
                      <p className={cn("text-xs mt-0.5", isDue ? "text-orange-500 font-medium" : "text-muted-foreground")}>
                        <Clock className="inline h-3 w-3 mr-1" />
                        {isDue ? "Due now" : formatDate(r.remindAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => dismissReminder(r.id)} title="Dismiss">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteReminder(r.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Dismissed/Sent */}
        {dismissed.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> Handled ({dismissed.length})
            </h2>
            <ul className="space-y-2 opacity-60">
              {dismissed.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm line-through text-muted-foreground">{r.task?.title ?? "Unknown task"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.remindAt)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteReminder(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium">Task</label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  {tasks.filter(t => t.status !== "DONE").map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Remind At</label>
              <Input
                type="datetime-local"
                value={remindAt}
                onChange={(e) => setRemindAt(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium">Message (optional)</label>
              <Input
                placeholder="e.g. Review slides before meeting"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!taskId || !remindAt}>Create reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}