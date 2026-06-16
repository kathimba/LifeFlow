// src/lib/use-documents.ts
// Replaces the localStorage useDocs hook — talks to /api/documents (R2 + Postgres)
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useUser } from "@/lib/auth/AuthProvider"

export type ApiDocument = {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  storageKey: string
  extractedText?: string | null
  goalId?: string | null
  taskId?: string | null
  createdAt: string
  downloadUrl?: string // only present on single-document GET
}

export const useDocuments = () => {
  const [docs, setDocs] = useState<ApiDocument[]>([])
  const [loading, setLoading] = useState(true)
  const { user, loading: authLoading } = useUser()
  const mounted = useRef(false)

  const fetchDocs = useCallback(async () => {
    if (authLoading || !user) {
      if (mounted.current) setLoading(false)
      return
    }
    try {
      const res = await fetch("/api/documents")
      const data = await res.json()
      if (mounted.current && Array.isArray(data)) setDocs(data)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [authLoading, user])

  useEffect(() => {
    mounted.current = true
    fetchDocs()
    return () => { mounted.current = false }
  }, [fetchDocs])

  // Upload a new file
  const upload = useCallback(
    async (file: File, opts?: { title?: string; goalId?: string | null; taskId?: string | null }) => {
      const formData = new FormData()
      formData.append("file", file)
      if (opts?.title) formData.append("title", opts.title)
      if (opts?.goalId) formData.append("goalId", opts.goalId)
      if (opts?.taskId) formData.append("taskId", opts.taskId)

      const res = await fetch("/api/documents", { method: "POST", body: formData })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Upload failed")
      }
      const doc = await res.json()
      await fetchDocs()
      return doc as ApiDocument
    },
    [fetchDocs]
  )

  // Update metadata (title, goalId, taskId)
  const update = useCallback(
    async (id: string, patch: Partial<Pick<ApiDocument, "title" | "goalId" | "taskId">>) => {
      setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
      await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
    },
    []
  )

  // Get a fresh presigned download URL for a document
  const getDownloadUrl = useCallback(async (id: string): Promise<string | null> => {
    const res = await fetch(`/api/documents/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    return data.downloadUrl ?? null
  }, [])

  // Delete a document (removes from R2 + Postgres)
  const remove = useCallback(async (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id))
    await fetch(`/api/documents/${id}`, { method: "DELETE" })
  }, [])

  return { docs, loading, upload, update, remove, getDownloadUrl, refetch: fetchDocs }
}
