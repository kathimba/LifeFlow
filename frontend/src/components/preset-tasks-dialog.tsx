"use client"

import { useState } from "react"
import { Sparkles, Plus, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { useTasks } from "@/lib/store"
import { presetCategories, type PresetTask } from "@/lib/preset-tasks"

export function PresetTasksDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { createTask } = useTasks()
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  const handleAdd = async (task: PresetTask, categoryId: string) => {
    const key = `${categoryId}::${task.title}`
    setAddedIds((prev) => new Set(prev).add(key))

    await createTask({
      title: task.title,
      description: task.description || undefined,
      priority: task.priority,
      recurrenceRule: task.recurrenceRule || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            More Tasks
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse ideas below and add the ones that speak to you.
          </p>
        </DialogHeader>

        <Accordion type="multiple" className="space-y-2">
          {presetCategories.map((category) => (
            <AccordionItem
              key={category.id}
              value={category.id}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <category.icon className="h-5 w-5 text-primary" />
                  {category.title}
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    {category.tasks.length}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-t border-border px-4 py-3 space-y-2">
                {category.tasks.map((task) => {
                  const key = `${category.id}::${task.title}`
                  const added = addedIds.has(key)
                  return (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-3 rounded-lg bg-secondary/20 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>P{task.priority}</span>
                          {task.recurrenceRule && (
                            <span className="capitalize">{task.recurrenceRule}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? "ghost" : "outline"}
                        className={cn("shrink-0 h-8 text-xs", added && "text-green-500")}
                        disabled={added}
                        onClick={() => handleAdd(task, category.id)}
                      >
                        {added ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {added ? "Added" : "Add"}
                      </Button>
                    </div>
                  )
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  )
}