"use client"

import { useState } from "react"
import { Bell, Check, X } from "lucide-react"
import { useReminders, type Reminder } from "@/lib/store"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

export function ReminderBell() {
  const { reminders, dismissReminder } = useReminders()
  const [open, setOpen] = useState(false)

  const pending = reminders.filter((r) => r.status === "PENDING")
  const due = pending.filter((r) => new Date(r.remindAt) <= new Date())

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await dismissReminder(id)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          {due.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {due.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Reminders</span>
          <Link href="/reminders" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
            View all
          </Link>
        </div>
        <div className="max-h-80 overflow-auto">
          {pending.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No pending reminders.
            </div>
          ) : (
            pending.slice(0, 5).map((r) => {
              const isDue = new Date(r.remindAt) <= new Date()
              return (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-start gap-3 border-b border-border px-4 py-3 last:border-0",
                    isDue && "bg-orange-500/5"
                  )}
                >
                  <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", isDue ? "text-orange-500" : "text-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {r.task?.title ?? "Task"}
                    </p>
                    {r.message && (
                      <p className="text-xs text-muted-foreground truncate">{r.message}</p>
                    )}
                    <p className={cn("text-xs", isDue ? "text-orange-500 font-medium" : "text-muted-foreground")}>
                      {isDue ? "Due now" : formatDate(r.remindAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDismiss(r.id, e)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}