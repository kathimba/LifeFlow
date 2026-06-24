"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, Target, Calendar, NotebookPen } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type WeeklyScore = {
  score: number
  change: number
  tasksCompleted: number
  tasksCreated: number
  focus: number
  consistency: number
  journalDays: number
}

export function WeeklyScoreCard() {
  const [data, setData] = useState<WeeklyScore | null>(null)

  useEffect(() => {
    fetch("/api/analytics/weekly-score")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return null

  const scoreColor =
    data.score >= 75 ? "text-green-500" :
    data.score >= 50 ? "text-yellow-500" :
    "text-red-500"

  const trendIcon =
    data.change > 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-500" /> :
    data.change < 0 ? <TrendingDown className="h-3.5 w-3.5 text-red-500" /> :
    <Minus className="h-3.5 w-3.5 text-muted-foreground" />

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          Weekly Productivity Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big score */}
        <div className="flex items-center justify-between">
          <div className={`text-5xl font-bold ${scoreColor}`}>{data.score}</div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">out of 100</div>
            <div className="flex items-center gap-1 text-xs mt-0.5">
              {trendIcon}
              <span className={data.change >= 0 ? "text-green-500" : "text-red-500"}>
                {data.change > 0 ? "+" : ""}{data.change}%
              </span>
              <span className="text-muted-foreground">vs last week</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreColor.replace("text", "bg")}`}
            style={{ width: `${Math.min(data.score, 100)}%` }}
          />
        </div>

        {/* Score breakdown — unique to this card */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <Target className="mx-auto h-4 w-4 text-primary mb-1" />
            <div className="text-lg font-semibold text-foreground">{data.focus}%</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Focus</div>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <Calendar className="mx-auto h-4 w-4 text-primary mb-1" />
            <div className="text-lg font-semibold text-foreground">{data.consistency}<span className="text-xs text-muted-foreground">/7</span></div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Days Active</div>
          </div>
          <div className="rounded-lg bg-secondary/50 p-3 text-center">
            <NotebookPen className="mx-auto h-4 w-4 text-primary mb-1" />
            <div className="text-lg font-semibold text-foreground">{data.journalDays}<span className="text-xs text-muted-foreground">/7</span></div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Journal</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}