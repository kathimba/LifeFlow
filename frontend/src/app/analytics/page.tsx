"use client"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { WeeklyReview } from "@/components/weekly-review"
import { PeakProductivityChart, GoalTrendsChart } from "@/components/analytics-charts"
import { TaskFlowChart } from "@/components/task-flow-chart"
import { WeeklyScoreCard } from "@/components/weekly-score"

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <div className="space-y-10">
        <PageHeader
          title="Analytics"
          description="Your productivity, mood, and goal progress at a glance."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <WeeklyScoreCard />
          <GoalTrendsChart />
        </div>

        <WeeklyReview />

        <div className="grid gap-6 lg:grid-cols-2">
          <TaskFlowChart />
          <PeakProductivityChart />
        </div>
      </div>
    </AppLayout>
  )
}