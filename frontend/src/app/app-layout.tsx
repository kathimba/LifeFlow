"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@/lib/auth/AuthProvider"
import { AppSidebar } from "@/components/app-sidebar"
import { SearchCommand } from "@/components/search-command"
import { ReminderBell } from "@/components/reminder-bell"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }
 
  if (!user) return null

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <SearchCommand />
            <div className="flex-1" />
            <ReminderBell />
          </header>
          <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}