import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Récupère l'utilisateur connecté (depuis la session NextAuth)
export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  return user
}

// Filtre Prisma selon le rôle (inchangé)
// - ADMIN voit tout
// - USER ne voit que ses propres données
export function visibilityFilter(user: { id: string; role: string } | null) {
  if (!user) return { userId: "__none__" }
  if (user.role === "ADMIN") return {}
  return { userId: user.id }
}