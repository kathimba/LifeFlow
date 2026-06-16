// src/app/api/journal/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getAuthUser } from "@lib/auth"
import { logJournalDeleted, logJournalUpdated } from "@lib/activity-log"

// ----------------------------------------------------------------
// GET /api/journal/:id
// ----------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params

  try {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, userId: user.id },
    })

    if (!entry) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(entry)
  } catch (error) {
    console.error("[GET /api/journal/:id]", error)
    return NextResponse.json(
      { error: "Failed to fetch journal entry" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// PATCH /api/journal/:id
// Body: { content?, mood?, energy? }
// ----------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      )
    }

    const body = await req.json()
    const { content, mood, energy } = body

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(mood    !== undefined && { mood }),
        ...(energy  !== undefined && { energy }),
      },
    })

    logJournalUpdated(user.id, entry.id, {
      mood: entry.mood,
      energy: entry.energy,
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error("[PATCH /api/journal/:id]", error)
    return NextResponse.json(
      { error: "Failed to update journal entry" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// DELETE /api/journal/:id
// ----------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { id } = await params

  try {
    const existing = await prisma.journalEntry.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      )
    }

    await prisma.journalEntry.delete({
      where: { id },
    })

    logJournalDeleted(user.id, id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/journal/:id]", error)
    return NextResponse.json(
      { error: "Failed to delete journal entry" },
      { status: 500 }
    )
  }
}
