"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { NotebookPen, Check, Trash2, Pencil, X, Flame, Frown, Meh, Smile, BatteryLow, BatteryFull, Sparkles } from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLogs, todayISO, addDays } from "@/lib/store"
import { SimilarEntries } from "@/components/similar-entries"

// Mood — 3 levels 
const moodMeta: Record<number, { label: string; Icon: typeof Frown }> = {
  1: { label: "Low",   Icon: Frown },
  3: { label: "Okay",  Icon: Meh },
  5: { label: "Great", Icon: Smile },
}

const energyMeta: Record<number, { label: string; Icon: typeof BatteryLow }> = {
  1: { label: "Low",   Icon: BatteryLow },
  5: { label: "High",  Icon: BatteryFull },
}

const moodOptions = [5, 3, 1]
const energyOptions = [5, 1]

const getDate = (iso: string) => iso.slice(0, 10)

export default function LogPage() {
  const { logs, createLog, updateLog, deleteLog } = useLogs()
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => { setToday(todayISO()) }, [])

  const todaysLog = useMemo(
    () => (today ? logs.find((l) => getDate(l.createdAt) === today) : undefined),
    [logs, today]
  )

  const past = useMemo(
    () => logs
      .filter((l) => today && getDate(l.createdAt) !== today)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [logs, today]
  )

  const streak = useMemo(() => {
    if (!today) return 0
    let count = 0
    let d = today
    while (logs.some((l) => getDate(l.createdAt) === d)) {
      count++
      d = addDays(d, -1)
    }
    return count
  }, [logs, today])

  const [content, setContent] = useState("")
  const [mood, setMood] = useState<number | undefined>(undefined)
  const [energy, setEnergy] = useState<number | undefined>(undefined)
  const [savedFlash, setSavedFlash] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [expandedSimilar, setExpandedSimilar] = useState<string | null>(null)

  // Refs so save() always reads latest values
  const contentRef = useRef(content)
  const moodRef = useRef(mood)
  const energyRef = useRef(energy)
  const logsRef = useRef(logs)
  useEffect(() => { contentRef.current = content }, [content])
  useEffect(() => { moodRef.current = mood }, [mood])
  useEffect(() => { energyRef.current = energy }, [energy])
  useEffect(() => { logsRef.current = logs }, [logs])

  // Hydrate from today's log
  const lastHydratedId = useRef<string | null>(null)
  useEffect(() => {
    if (todaysLog && todaysLog.id !== lastHydratedId.current) {
      lastHydratedId.current = todaysLog.id
      setContent(todaysLog.content ?? "")
      setMood(todaysLog.mood ?? undefined)
      setEnergy(todaysLog.energy ?? undefined)
    }
    if (!todaysLog && lastHydratedId.current) {
      lastHydratedId.current = null
      setContent("")
      setMood(undefined)
      setEnergy(undefined)
    }
  }, [todaysLog])

  const savingRef = useRef(false)

const save = useCallback(async () => {
    if (savingRef.current) return  // Already saving — skip
    if (!today) return
    
    const c = contentRef.current.trim()
    const m = moodRef.current
    const e = energyRef.current
    if (!c && !m && !e) return

    savingRef.current = true
    try {
      const currentLogs = logsRef.current
      const currentTodaysLog = currentLogs.find((l) => getDate(l.createdAt) === today)
      
      if (currentTodaysLog) {
        await updateLog(currentTodaysLog.id, { content: c, mood: m ?? null, energy: e ?? null })
      } else {
        await createLog({ content: c, mood: m ?? null, energy: e ?? null })
      }
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1400)
    } finally {
      savingRef.current = false
    }
  }, [today, createLog, updateLog])

  const handleContentChange = (value: string) => setContent(value)

  const handleMoodChange = (m: number | undefined) => {
    setMood(m)
    moodRef.current = m
    save()
  }

  const handleEnergyChange = (e: number | undefined) => {
    setEnergy(e)
    energyRef.current = e
    save()
  }

  const handleDelete = async (id: string) => { await deleteLog(id) }

  const startEdit = (entryId: string, currentContent: string) => {
    setEditingId(entryId)
    setEditContent(currentContent)
  }

  const saveEdit = async (entryId: string) => {
    await updateLog(entryId, { content: editContent.trim() })
    setEditingId(null)
  }

  const dateLabel = today
    ? new Date(today + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : ""

  return (
    <AppLayout>
      <div className="space-y-10">
        <PageHeader
          title="Daily Log"
          description={dateLabel || "Your personal thinking space"}
          actions={
            <div className="flex items-center gap-2">
              {streak > 1 && (
                <span className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                  <Flame className="h-3.5 w-3.5" />{streak} day streak
                </span>
              )}
              <Button onClick={save} className="gap-1.5" disabled={!content.trim() && !mood && !energy}>
                {savedFlash ? <><Check className="h-4 w-4" />Saved</> : todaysLog ? "Update" : "Save entry"}
              </Button>
            </div>
          }
        />

        <section className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s entry</h2>
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
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
                const { Icon } = moodMeta[m]
                return (
                  <button key={m} onClick={() => handleMoodChange(mood === m ? undefined : m)}
                    className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      mood === m ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground")}>
                    <Icon className="h-4 w-4" />
                    {moodMeta[m].label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Energy</h2>
            <div className="flex flex-wrap gap-2">
              {energyOptions.map((e) => {
                const { Icon } = energyMeta[e]
                return (
                  <button key={e} onClick={() => handleEnergyChange(energy === e ? undefined : e)}
                    className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                      energy === e ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground")}>
                    <Icon className="h-4 w-4" />
                    {energyMeta[e].label}
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
                const logDate = getDate(l.createdAt)
                const isEditing = editingId === l.id
                return (
                  <li key={l.id} className="relative group">
                    <span className="absolute -left-[27px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-medium text-muted-foreground">
                          {new Date(logDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        </div>
                        <div className="flex items-center gap-2">
                          {l.energy && energyMeta[l.energy] && (() => {
                            const EnergyIcon = energyMeta[l.energy].Icon
                            return (
                              <span className="text-xs text-muted-foreground">
                                <EnergyIcon className="h-3.5 w-3.5 inline" /> {energyMeta[l.energy].label}
                              </span>
                            )
                          })()}
                          {l.mood && moodMeta[l.mood] && (() => {
                            const MoodIcon = moodMeta[l.mood].Icon
                            return (
                              <span className="text-xs text-muted-foreground">
                                <MoodIcon className="h-3.5 w-3.5 inline" /> {moodMeta[l.mood].label}
                              </span>
                            )
                          })()}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(l.id, l.content)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(l.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-2 space-y-2">
                          <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="resize-none text-sm" autoFocus />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => saveEdit(l.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ) : l.content ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{l.content}</p>
                      ) : (
                        <p className="mt-2 text-sm italic text-muted-foreground">Mood & energy check-in only</p>
                      )}
                      {/* Similar entries toggle */}
                      {/* Similar entries toggle */}
                      <div className="mt-3 border-t border-border pt-3">
                        <button
                          onClick={() => setExpandedSimilar(expandedSimilar === l.id ? null : l.id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded border border-border text-[10px] group-hover:border-foreground/30 transition-colors">
                            {expandedSimilar === l.id ? "▾" : "▸"}
                          </span>
                        </button>
                        {expandedSimilar === l.id && <SimilarEntries entryId={l.id} />}
                      </div>
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