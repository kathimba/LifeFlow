// src/app/api/journal/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@lib/prisma"
import { getAuthUser } from "@lib/auth"
import { logJournalCreated } from "@lib/activity-log"

// ----------------------------------------------------------------
// GET /api/journal
// Returns all journal entries for a user, newest first
// Query params: ?userId=<uuid>&limit=<number>
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = searchParams.get("limit")

  try {
    const entries = await prisma.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: parseInt(limit) } : {}),
    })

    return NextResponse.json(entries)
  } catch (error) {
    console.error("[GET /api/journal]", error)
    return NextResponse.json(
      { error: "Failed to fetch journal entries" },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------
// POST /api/journal
// Creates a new journal entry
// Body: { userId, content, mood?, energy? }
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { content, mood, energy } = body

    if (!content?.trim() && !mood && !energy) {
      return NextResponse.json(
        { error: "At least one of content, mood, or energy is required" },
        { status: 400 }
      )
    }

    const entry = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        content,
        mood:   mood   ?? null,
        energy: energy ?? null,
      },
    })

    logJournalCreated(user.id, entry.id, {
      mood: entry.mood,
      energy: entry.energy,
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("[POST /api/journal]", error)
    return NextResponse.json(
      { error: "Failed to create journal entry" },
      { status: 500 }
    )
  }
}
