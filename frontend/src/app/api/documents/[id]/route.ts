// src/app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { prisma } from "@lib/prisma"
import { getApiUser } from "@lib/api-user"
import { r2, R2_BUCKET } from "@lib/r2"

// ----------------------------------------------------------------
// GET /api/documents/:id
// Returns document metadata + a presigned download URL (valid 1 hour)
// ----------------------------------------------------------------
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getApiUser()
  if (error) return error
  const { id } = await params

  try {
    const document = await prisma.document.findFirst({
      where: { id, userId: userId! },
    })
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const downloadUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: document.storageKey }),
      { expiresIn: 3600 }
    )

    return NextResponse.json({ ...document, downloadUrl })
  } catch (err) {
    console.error("[GET /api/documents/:id]", err)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

// ----------------------------------------------------------------
// PATCH /api/documents/:id
// Updates title, goalId, or taskId linkage (not the file itself)
// ----------------------------------------------------------------
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getApiUser()
  if (error) return error
  const { id } = await params

  try {
    const body = await req.json()
    const { title, goalId, taskId } = body

    const existing = await prisma.document.findFirst({ where: { id, userId: userId! } })
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(goalId !== undefined && { goalId }),
        ...(taskId !== undefined && { taskId }),
      },
    })

    return NextResponse.json(document)
  } catch (err) {
    console.error("[PATCH /api/documents/:id]", err)
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}

// ----------------------------------------------------------------
// DELETE /api/documents/:id
// Removes both the R2 object and the Postgres record
// ----------------------------------------------------------------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getApiUser()
  if (error) return error
  const { id } = await params

  try {
    const existing = await prisma.document.findFirst({ where: { id, userId: userId! } })
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    await r2.send(
      new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: existing.storageKey })
    )

    await prisma.document.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/documents/:id]", err)
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
