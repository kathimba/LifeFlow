"use client"

import { useState } from "react"
import { Lightbulb, ChevronDown, ChevronUp, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const sections = [
  {
    emoji: "📅",
    title: "Quick Facts",
    time: "30 sec",
    prompts: [
      "Today's date",
      "One-word mood",
      "One-word energy level",
    ],
  },
  {
    emoji: "⭐",
    title: "What Happened",
    time: "2-3 min",
    prompts: [
      "3 things that happened today (work, personal, random)",
      "One win, however small",
      "One thing that was hard or frustrating",
    ],
  },
  {
    emoji: "🧠",
    title: "Reflection",
    time: "2-3 min",
    prompts: [
      "What did I learn or notice about myself today?",
      "What would I do differently if I could redo today?",
    ],
  },
  {
    emoji: "🚀",
    title: "Tomorrow",
    time: "1-2 min",
    prompts: [
      "#1 priority for tomorrow",
      "One thing I'm looking forward to",
    ],
  },
  {
    emoji: "🙏",
    title: "Gratitude",
    time: "30 sec",
    prompts: [
      "One thing I'm grateful for today",
    ],
  },
]

export function JournalGuide() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Need help journaling?
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            Answer these prompts — no need to write a story. Total time:{" "}
            <span className="font-medium text-foreground">5-10 minutes</span>.
          </p>

          <div className="space-y-2">
            {sections.map((section) => (
              <div
                key={section.title}
                className="rounded-lg bg-secondary/30 p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">
                    {section.emoji} {section.title}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {section.time}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {section.prompts.map((prompt) => (
                    <li
                      key={prompt}
                      className="text-xs text-muted-foreground pl-3"
                    >
                      — {prompt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}