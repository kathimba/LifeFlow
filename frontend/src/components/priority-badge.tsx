import { cn } from "@/lib/utils"

/**
 * Shared priority badge.
 * 1 = red (urgent), 2 = orange, 3 = yellow, 4-5 = gray (per design system).
 * Matches the DB priority field directly — no string translation.
 */
const styles: Record<number, string> = {
  1: "bg-destructive/10 text-destructive border-destructive/20",
  2: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  3: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  4: "bg-muted text-muted-foreground border-border",
  5: "bg-muted text-muted-foreground border-border",
}

const labels: Record<number, string> = {
  1: "P1", 2: "P2", 3: "P3", 4: "P4", 5: "P5",
}

export function PriorityBadge({
  priority,
  size = "sm",
}: {
  priority?: number
  size?: "sm" | "xs"
}) {
  const p = priority ?? 3
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wide",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
        styles[p] ?? styles[3]
      )}
    >
      {labels[p] ?? "P3"}
    </span>
  )
}

export const priorityBadgeStyles = styles
