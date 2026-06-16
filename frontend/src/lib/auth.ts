// src/lib/auth.ts
// Helper to get the current user in API routes
import { createClient } from "@lib/supabase/server"
import { prisma } from "@lib/prisma"

export async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const name = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null

  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email ?? `${user.id}@lifeflow.local`,
      ...(name !== null && { name }),
    },
    create: {
      id: user.id,
      email: user.email ?? `${user.id}@lifeflow.local`,
      name,
    },
  })

  return user
}
