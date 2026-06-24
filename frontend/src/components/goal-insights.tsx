"use client"

import { useEffect, useState } from "react"
import { Lightbulb, Target, AlertCircle, TrendingUp, CalendarClock, Flag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Nudge = {
  type: string
  severity: "positive" | "warning" | "critical"
  title: string
  message: string
  goalId?: string
  goalTitle?: string
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  stale_goal: AlertCircle,
  missing_next_action: Target,
  deadline_risk: CalendarClock,
  momentum: TrendingUp,
  priority_misalignment: Flag,
}

const severityStyles = {
  positive: "border-green-500/30 bg-green-500/5",
  warning: "border-orange-500/30 bg-orange-500/5",
  critical: "border-red-500/30 bg-red-500/5",
}

export function GoalInsights() {
  const [nudges, setNudges] = useState<Nudge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/nudges")
      .then((r) => r.json())
      .then((data) => setNudges(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || nudges.length === 0) return null

  // Show at most 3 nudges, prioritizing critical > warning > positive
  const displayed = [...nudges]
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, positive: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 3)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="h-4 w-4 text-primary" />
          Goal Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayed.map((nudge, i) => {
          const Icon = iconMap[nudge.type] || Target
          return (
            <div
              key={i}
              className={cn("rounded-lg border p-3", severityStyles[nudge.severity])}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn("h-4 w-4 shrink-0 mt-0.5",
                  nudge.severity === "positive" ? "text-green-500" :
                  nudge.severity === "critical" ? "text-red-500" :
                  "text-orange-500"
                )} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{nudge.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{nudge.message}</p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}