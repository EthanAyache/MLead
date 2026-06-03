// Helper pour récupérer l'utilisateur connecté + ses droits
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return null

  // Récupérer notre user en base avec son rôle
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
  })

  return user
}

// Renvoie un filtre Prisma WHERE selon le rôle
// - ADMIN voit tout
// - USER ne voit que ses propres données
export function visibilityFilter(user: { id: string; role: string } | null) {
  if (!user) return { userId: '__none__' } // bloque tout
  if (user.role === 'ADMIN') return {} // pas de filtre, voit tout
  return { userId: user.id } // filtre sur son userId
}