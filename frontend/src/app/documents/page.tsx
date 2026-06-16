"use client"

import { useRef, useState, useEffect } from "react"
import {
  FileText, Image as ImageIcon, FileType2, Trash2,
  UploadCloud, Target, CheckCircle2, Plus, Loader2,
} from "lucide-react"

import AppLayout from "@/app/app-layout"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useGoals, useTasks } from "@/lib/store"
import { useDocuments, type ApiDocument } from "@/lib/use-documents"

const NONE = "__none__"
const MAX_BYTES = 20 * 1024 * 1024 // 20MB — matches server limit

function formatBytes(n?: number) {
  if (!n && n !== 0) return ""
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(type?: string) {
  if (!type) return FileText
  if (type.startsWith("image/")) return ImageIcon
  if (type.includes("pdf")) return FileType2
  return FileText
}

function isPreviewable(type?: string) {
  if (!type) return false
  return type.startsWith("image/") || type === "application/pdf" || type.startsWith("text/")
}

export default function DocumentsPage() {
  const { docs, loading, upload, update, remove, getDownloadUrl } = useDocuments()
  const { goals } = useGoals()
  const { tasks } = useTasks()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!activeId && docs.length > 0) setActiveId(docs[0].id)
  }, [docs, activeId])

  const active = docs.find((d) => d.id === activeId) ?? null

  // Fetch a fresh presigned URL whenever the active doc changes
  useEffect(() => {
    if (!active) {
      setPreviewUrl(null)
      return
    }
    setPreviewLoading(true)
    getDownloadUrl(active.id).then((url) => {
      setPreviewUrl(url)
      setPreviewLoading(false)
    })
  }, [active?.id, getDownloadUrl])

  const handleFiles = async (files: FileList | File[]) => {
    setUploadError(null)
    const arr = Array.from(files)
    setUploading(true)
    let firstUploadedId: string | null = null

    for (const f of arr) {
      if (f.size > MAX_BYTES) {
        setUploadError(`"${f.name}" is larger than ${MAX_BYTES / 1024 / 1024}MB.`)
        continue
      }
      try {
        const doc = await upload(f)
        if (!firstUploadedId) firstUploadedId = doc.id
      } catch (err: any) {
        setUploadError(err.message || `Failed to upload "${f.name}"`)
      }
    }

    setUploading(false)
    if (firstUploadedId) setActiveId(firstUploadedId)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const handleRemove = async (id: string) => {
    await remove(id)
    if (activeId === id) {
      const next = docs.filter((d) => d.id !== id)
      setActiveId(next[0]?.id ?? null)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <PageHeader
          title="Documents"
          description="Files connected to the goals and tasks they support."
          actions={
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Upload
            </Button>
          }
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf,image/*,text/plain,text/markdown,.md"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files)
            e.target.value = ""
          }}
        />

        {/* Drop area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed bg-card/40 px-6 py-8 text-center transition-colors",
            dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-card"
          )}
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">
            {uploading ? "Uploading…" : "Drag & drop files, or click to upload"}
          </div>
          <div className="text-xs text-muted-foreground">
            PDFs, images, and text/markdown notes. Up to 20 MB per file.
          </div>
          {uploadError && <div className="mt-2 text-xs text-destructive">{uploadError}</div>}
        </div>

        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          {/* File list */}
          <aside className="space-y-2">
            <div className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Files ({docs.length})
            </div>
            {loading ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Loading…
              </p>
            ) : docs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No documents yet. Upload one above.
              </p>
            ) : (
              <ul className="space-y-1">
                {docs.map((d) => {
                  const Icon = fileIcon(d.fileType)
                  const goal = goals.find((g) => g.id === d.goalId)
                  const task = tasks.find((t) => t.id === d.taskId)
                  return (
                    <li key={d.id}>
                      <button
                        onClick={() => setActiveId(d.id)}
                        className={cn(
                          "group flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          d.id === activeId ? "border-primary/40 bg-secondary" : "border-transparent hover:bg-secondary/60"
                        )}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">
                            {d.title || d.fileName || "Untitled"}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                            <span>{new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                            <span>{formatBytes(d.fileSize)}</span>
                          </div>
                          {(goal || task) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {goal && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-accent/50 px-1.5 py-0.5 text-[10px] text-accent-foreground">
                                  <Target className="h-2.5 w-2.5" />
                                  <span className="max-w-[8rem] truncate">{goal.title}</span>
                                </span>
                              )}
                              {task && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  <span className="max-w-[8rem] truncate">{task.title}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span
                          role="button"
                          onClick={(e) => { e.stopPropagation(); handleRemove(d.id) }}
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          {/* Preview + metadata */}
          <section className="min-w-0">
            {active ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <Input
                    value={active.title}
                    onChange={(e) => update(active.id, { title: e.target.value })}
                    placeholder="Untitled"
                    className="border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{active.fileName}</span>
                    <span>{formatBytes(active.fileSize)}</span>
                    <span>
                      Uploaded {new Date(active.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium">Linked goal</label>
                      <Select
                        value={active.goalId ?? NONE}
                        onValueChange={(v) => update(active.id, { goalId: v === NONE ? null : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="No goal" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No goal</SelectItem>
                          {goals.map((g) => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium">Linked task</label>
                      <Select
                        value={active.taskId ?? NONE}
                        onValueChange={(v) => update(active.id, { taskId: v === NONE ? null : v })}
                      >
                        <SelectTrigger><SelectValue placeholder="No task" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No task</SelectItem>
                          {tasks.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
                  <DocPreview doc={active} previewUrl={previewUrl} loading={previewLoading} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
                Upload or select a document to preview it here.
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  )
}

function DocPreview({ doc, previewUrl, loading }: { doc: ApiDocument; previewUrl: string | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>Loading preview…</p>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <FileText className="h-8 w-8" />
        <p>Preview unavailable.</p>
      </div>
    )
  }

  if (doc.fileType.startsWith("image/")) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-muted/40 p-4">
        <img src={previewUrl} alt={doc.title} className="max-h-[480px] w-auto rounded-lg object-contain" />
      </div>
    )
  }

  if (isPreviewable(doc.fileType)) {
    return <iframe src={previewUrl} title={doc.title} className="h-[520px] w-full rounded-xl bg-muted/40" />
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
      <FileText className="h-10 w-10" />
      <p>Preview not available for this file type.</p>
      <a
        href={previewUrl}
        download={doc.fileName}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
      >
        Download {doc.fileName}
      </a>
    </div>
  )
}
