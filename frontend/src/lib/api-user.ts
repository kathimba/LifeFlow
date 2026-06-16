// src/lib/api-user.ts
// Gets the authenticated user from Supabase session and ensures
// a matching record exists in our Prisma users table.
import { createClient } from "@lib/supabase/server"
import { prisma } from "@lib/prisma"
import { NextResponse } from "next/server"

export async function getApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, userId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  // Upsert into Prisma users table — creates on first login, no-op after
  await prisma.user.upsert({
    where:  { id: user.id },
    update: { email: user.email! },
    create: {
      id:    user.id,
      email: user.email!,
      name:  user.user_metadata?.name ?? null,
    },
  })

  return { user, userId: user.id, error: null }
}
