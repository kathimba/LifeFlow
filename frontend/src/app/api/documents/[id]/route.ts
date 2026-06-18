 import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@lib/api-user";
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentDownloadUrl,
} from "@/lib/services/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getApiUser();
  if (error) return error;

  try {
    const { id } = await params;
    const document = await getDocumentById(userId!, id);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { downloadUrl } = await getDocumentDownloadUrl(userId!, id);

    return NextResponse.json({ ...document, downloadUrl });
  } catch (err) {
    if (err instanceof Error && err.message === "Document not found") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    console.error("[GET /api/documents/:id]", err);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getApiUser();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();
    const document = await updateDocument(userId!, id, body);
    return NextResponse.json(document);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "Document not found") {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      if (err.message === "Goal not found") {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }
      if (err.message === "Task not found") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
    }
    console.error("[PATCH /api/documents/:id]", err);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error } = await getApiUser();
  if (error) return error;

  try {
    const { id } = await params;
    await deleteDocument(userId!, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Document not found") {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    console.error("[DELETE /api/documents/:id]", err);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}