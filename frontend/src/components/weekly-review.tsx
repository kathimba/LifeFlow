"use client"

import { useEffect, useState } from "react"
import { BarChart3, Target, AlertCircle, Lightbulb, Smile, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type WeeklyReview = {
  weekStart: string
  weekEnd: string
  tasksCompleted: number
  mostProductiveDay: string | null
  topGoal: { id: string; title: string; count: number } | null
  staleGoals: { id: string; title: string; daysSinceLastCompletion: number }[]
  recommendation: string | null
  averageMood: number | null
  averageEnergy: number | null
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`
}

const moodEmoji = (v: number) => {
  if (v >= 4.5) return "🤩"
  if (v >= 3.5) return "🙂"
  if (v >= 2.5) return "😐"
  if (v >= 1.5) return "😕"
  return "😣"
}

const energyEmoji = (v: number) => {
  if (v >= 4.5) return "🚀"
  if (v >= 3.5) return "⚡"
  if (v >= 2.5) return "🔋"
  if (v >= 1.5) return "🪫"
  return "😴"
}

export function WeeklyReview() {
  const [review, setReview] = useState<WeeklyReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/analytics/weekly")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load")
        return r.json()
      })
      .then((data) => setReview(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading review…
        </CardContent>
      </Card>
    )
  }

  if (error || !review) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" />
          Weekly Review
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {formatDateRange(review.weekStart, review.weekEnd)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Top goal */}
        {review.topGoal && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <Target className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-muted-foreground">Top goal:</span>
            <span className="font-medium text-foreground">{review.topGoal.title}</span>
            <span className="ml-auto text-xs text-muted-foreground">{review.topGoal.count} tasks</span>
          </div>
        )}

        {/* Mood + Energy row */}
        {(review.averageMood || review.averageEnergy) && (
          <div className="grid grid-cols-2 gap-3">
            {review.averageMood && (
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <div className="text-2xl">{moodEmoji(review.averageMood)}</div>
                <div className="text-xs text-muted-foreground mt-1">Avg Mood</div>
              </div>
            )}
            {review.averageEnergy && (
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <div className="text-2xl">{energyEmoji(review.averageEnergy)}</div>
                <div className="text-xs text-muted-foreground mt-1">Avg Energy</div>
              </div>
            )}
          </div>
        )}

        {/* Stale goals */}
        {review.staleGoals.length > 0 && (
          <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
            <div className="flex items-center gap-2 mb-2 text-sm">
              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="font-medium text-orange-600 dark:text-orange-400">Needs attention</span>
            </div>
            <ul className="space-y-1">
              {review.staleGoals.map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shrink-0" />
                  {g.title}
                  <span className="text-orange-500">({g.daysSinceLastCompletion}+ days)</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendation */}
        {review.recommendation && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground">{review.recommendation}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}