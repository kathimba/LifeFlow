// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { prisma } from "@lib/prisma"
import { getApiUser } from "@lib/api-user"
import { r2, R2_BUCKET, buildStorageKey, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@lib/r2"

// ----------------------------------------------------------------
// GET /api/documents
// Returns all documents for the user, optionally filtered by goal/task
// ----------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { userId, error } = await getApiUser()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const goalId = searchParams.get("goalId")
  const taskId = searchParams.get("taskId")

  try {
    const documents = await prisma.document.findMany({
      where: {
        userId: userId!,
        ...(goalId && { goalId }),
        ...(taskId && { taskId }),
      },
      include: {
        goal: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(documents)
  } catch (err) {
    console.error("[GET /api/documents]", err)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

// ----------------------------------------------------------------
// POST /api/documents
// Accepts multipart/form-data upload, stores file in R2,
// creates a Document record in Postgres.
//
// Form fields: file (required), title?, goalId?, taskId?
// ----------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { userId, error } = await getApiUser()
  if (error) return error

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const title = formData.get("title") as string | null
    const goalId = formData.get("goalId") as string | null
    const taskId = formData.get("taskId") as string | null

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: `File type "${file.type}" not allowed. Supported: PDF, images, text/markdown.` },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      )
    }

    const storageKey = buildStorageKey(userId!, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())

    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: storageKey,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const document = await prisma.document.create({
      data: {
        userId: userId!,
        title: title || file.name,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageKey,
        goalId: goalId || null,
        taskId: taskId || null,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (err) {
    console.error("[POST /api/documents]", err)
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 })
  }
}
