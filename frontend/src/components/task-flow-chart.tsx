"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type TaskFlow = {
  weeks: { weekLabel: string; created: number; completed: number; ratio: number }[]
  currentRatio: number
  status: "healthy" | "normal" | "overloaded"
}

const statusConfig = {
  healthy:  { label: "Healthy",   color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30" },
  normal:   { label: "Normal",    color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  overloaded: { label: "Overloaded", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
}

export function TaskFlowChart() {
  const [data, setData] = useState<TaskFlow | null>(null)

  useEffect(() => {
    fetch("/api/analytics/task-flow")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data || data.weeks.length === 0) return null

  const status = statusConfig[data.status]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          Weekly Task Flow
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge */}
        <div className={cn("flex items-center justify-between rounded-lg border px-4 py-3", status.border, status.bg)}>
          <span className="text-sm font-medium">Execution Ratio</span>
          <div className="text-right">
            <span className={cn("text-2xl font-bold", status.color)}>{data.currentRatio}%</span>
            <span className={cn("ml-2 text-xs font-medium", status.color)}>{status.label}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.weeks} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="created" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} name="Created" />
              <Bar dataKey="completed" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Interpretation */}
        <p className="text-xs text-muted-foreground">
          {data.status === "healthy" && "Great balance — you're completing more than you create."}
          {data.status === "normal" && "Steady pace — watch for backlog growth."}
          {data.status === "overloaded" && "Backlog is growing — try completing before creating new tasks."}
        </p>
      </CardContent>
    </Card>
  )
}