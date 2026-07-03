"use client"

import { useEffect, useState } from "react"
import { Sparkles, Frown, Meh, Smile, BatteryLow, BatteryFull } from "lucide-react"
import { cn } from "@/lib/utils"

type SimilarEntry = {
  id: string
  content: string
  mood: number | null
  createdAt: string
  similarity: number
}

const moodMeta: Record<number, { label: string; Icon: typeof Frown }> = {
  1: { label: "Low",   Icon: Frown },
  3: { label: "Okay",  Icon: Meh },
  5: { label: "Great", Icon: Smile },
}

const energyMeta: Record<number, { label: string; Icon: typeof BatteryLow }> = {
  1: { label: "Low",   Icon: BatteryLow },
  5: { label: "High",  Icon: BatteryFull },
}

export function SimilarEntries({ entryId }: { entryId: string }) {
  const [entries, setEntries] = useState<SimilarEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/journal/${entryId}/similar`)
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [entryId])

  if (loading || entries.length === 0) return null

  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Similar entries
      </h3>
      <ul className="space-y-2">
        {entries.map((e) => {
          const MoodIcon = e.mood ? moodMeta[e.mood]?.Icon : null
          return (
            <li key={e.id} className="rounded-lg bg-secondary/30 px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(e.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(e.similarity * 100)}% match
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground line-clamp-2">
                {MoodIcon && <MoodIcon className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />}
                {e.content}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}