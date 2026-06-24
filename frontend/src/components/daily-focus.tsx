"use client"

import { useEffect, useState } from "react"
import { Sparkles, Calendar, Target, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PriorityBadge } from "@/components/priority-badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

type DailyFocus = {
  task: {
    id: string
    title: string
    priority: number
    dueDate: string | null
    goal?: { id: string; title: string } | null
  }
  reason: string
}

export function DailyFocusCard() {
  const [focus, setFocus] = useState<DailyFocus | null>(null)

  useEffect(() => {
    fetch("/api/recommendations/daily-focus")
      .then((r) => r.json())
      .then(setFocus)
      .catch(() => {})
  }, [])

  if (!focus) return null

  const { task: t, reason } = focus
  const isOverdue = t.dueDate && new Date(t.dueDate) <= new Date()

  return (
    <Card className={cn(
      "border-2",
      isOverdue ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/5"
    )}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className={cn("h-4 w-4", isOverdue ? "text-destructive" : "text-primary")} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Focus
          </span>
        </div>

        <Link href="/tasks" className="block">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{reason}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PriorityBadge priority={t.priority} size="xs" />
                {t.dueDate && (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px]",
                    isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    <Calendar className="h-2.5 w-2.5" />
                    {isOverdue ? "Overdue" : new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
                {t.goal && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Target className="h-2.5 w-2.5" />
                    {t.goal.title}
                  </span>
                )}
              </div>
            </div>
            <ArrowRight className={cn("h-5 w-5 shrink-0 mt-1", isOverdue ? "text-destructive" : "text-primary")} />
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}