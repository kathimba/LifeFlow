"use client"

import { useEffect, useMemo, useState } from "react"
import { NotebookPen, Check } from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLogs, todayISO } from "@/lib/store"

// Mood is stored as 1-5 in the DB. Map to label/emoji for display.
const moodMeta: Record<number, { label: string; emoji: string }> = {
  1: { label: "Rough", emoji: "😣" },
  2: { label: "Low",   emoji: "😕" },
  3: { label: "Okay",  emoji: "😐" },
  4: { label: "Good",  emoji: "🙂" },
  5: { label: "Great", emoji: "🤩" },
}
const moodOptions = [5, 4, 3, 2, 1] // display great -> rough, left to right

export default function LogPage() {
  const { logs, createLog, updateLog } = useLogs()
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => { queueMicrotask(() => setToday(todayISO())) }, [])

  // Today's entry is the most recent log created today, if any
  const todaysLog = useMemo(
    () => (today ? logs.find((l) => l.createdAt.slice(0, 10) === today) : undefined),
    [logs, today]
  )

  const [content, setContent] = useState("")
  const [mood, setMood] = useState<number | undefined>(undefined)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (todaysLog) {
      queueMicrotask(() => {
        setContent(todaysLog.content ?? "")
        setMood(todaysLog.mood ?? undefined)
      })
    }
  }, [todaysLog])

  const past = useMemo(
    () => [...logs].filter((l) => !today || l.createdAt.slice(0, 10) !== today)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [logs, today]
  )

  const save = async () => {
    if (!today) return
    const trimmed = content.trim()
    if (!trimmed && !mood) return

    if (todaysLog) {
      await updateLog(todaysLog.id, { content: trimmed, mood: mood ?? null })
    } else {
      await createLog({ content: trimmed, mood: mood ?? null })
    }
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1400)
  }

  const dateLabel = today
    ? new Date(today).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : ""

  return (
    <AppLayout>
      <div className="space-y-10">
        <PageHeader
          title="Daily Log"
          description={dateLabel || "Your personal thinking space"}
          actions={
            <Button onClick={save} className="gap-1.5">
              {savedFlash ? <><Check className="h-4 w-4" />Saved</> : todaysLog ? "Update" : "Save entry"}
            </Button>
          }
        />

        <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s entry</h2>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={save}
              rows={6}
              placeholder="What moved forward today? Wins, doubts, ideas, what's next…"
              className="mt-2 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="border-t border-border" />

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mood</h2>
            <div className="flex flex-wrap gap-2">
              {moodOptions.map((m) => {
                const active = mood === m
                return (
                  <button
                    key={m}
                    onClick={() => setMood(active ? undefined : m)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="text-base leading-none">{moodMeta[m].emoji}</span>
                    {moodMeta[m].label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <NotebookPen className="h-4 w-4 text-primary" />Timeline
          </div>

          {past.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-card/40 py-10 text-center text-sm text-muted-foreground">
              Your daily log will build up here, one entry at a time.
            </p>
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {past.map((l) => {
                const logDate = l.createdAt.slice(0, 10)
                return (
                  <li key={l.id} className="relative">
                    <span className="absolute -left-[27px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-muted-foreground">
                          {new Date(logDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                        {l.mood && (
                          <span className="text-xs text-muted-foreground" title={moodMeta[l.mood].label}>
                            {moodMeta[l.mood].emoji} {moodMeta[l.mood].label}
                          </span>
                        )}
                      </div>
                      {l.content && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{l.content}</p>}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
