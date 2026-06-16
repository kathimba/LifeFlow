// src/lib/r2.ts
// Cloudflare R2 client — S3-compatible API
import { S3Client } from "@aws-sdk/client-s3"

export const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const R2_BUCKET = process.env.R2_BUCKET_NAME!

// Build a unique, collision-safe storage key for a file
export function buildStorageKey(userId: string, fileName: string): string {
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  return `${userId}/${timestamp}-${safeName}`
}

// Allowed mime types for upload — PDFs, images, text/markdown
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/markdown",
] as const

export const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
