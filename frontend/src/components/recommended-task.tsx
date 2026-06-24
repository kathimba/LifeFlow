"use client"

import { useEffect, useState, useCallback } from "react"
import { Lightbulb, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PriorityBadge } from "@/components/priority-badge"
import { cn } from "@/lib/utils"

type ScoredTask = {
  task: {
    id: string
    title: string
    priority: number
    dueDate: string | null
    goal?: { id: string; title: string } | null
  }
  score: number
}

export function RecommendedTask() {
  const [tasks, setTasks] = useState<ScoredTask[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchRecommendation = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/recommendations/next-task?n=1")
      const data = await res.json()
      setTasks(data)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecommendation()
  }, [fetchRecommendation])

  if (loading || tasks.length === 0) return null

  const t = tasks[0].task
  const isOverdue = t.dueDate && new Date(t.dueDate) <= new Date()

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium">{t.title}</span>
        <span className="ml-2">
          <PriorityBadge priority={t.priority} size="xs" />
        </span>
        {isOverdue && (
          <span className="ml-1.5 text-[10px] font-medium text-destructive">Overdue</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={fetchRecommendation}
        disabled={refreshing}
        className="h-7 w-7 shrink-0"
        title="Refresh"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
      </Button>
    </div>
  )
}