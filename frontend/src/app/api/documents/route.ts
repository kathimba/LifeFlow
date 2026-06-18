import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@lib/api-user";
import { getDocuments, uploadDocument } from "@/lib/services/documents";

export async function GET(req: NextRequest) {
  const { userId, error } = await getApiUser();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const documents = await getDocuments(userId!, {
      goalId: searchParams.get("goalId") || undefined,
      taskId: searchParams.get("taskId") || undefined,
    });
    return NextResponse.json(documents);
  } catch (err) {
    console.error("[GET /api/documents]", err);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId, error } = await getApiUser();
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;
    const goalId = formData.get("goalId") as string | null;
    const taskId = formData.get("taskId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const document = await uploadDocument(userId!, {
      file,
      title: title || undefined,
      description: description || undefined, 
      goalId: goalId || null,
      taskId: taskId || null,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.startsWith("File type")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.message.startsWith("File too large")) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.message === "Goal not found") {
        return NextResponse.json({ error: "Goal not found" }, { status: 404 });
      }
      if (err.message === "Task not found") {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
    }
    console.error("[POST /api/documents]", err);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}