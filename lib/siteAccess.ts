import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Deux profils peuvent modifier la page d'un site : le client propriétaire (session portail)
// et l'équipe Mr.Lead (session NextAuth, dans la limite de son périmètre).
// Renvoie l'id du site si l'appelant a le droit de l'éditer, sinon null.
export async function findEditableSite(siteId: string): Promise<{ id: string } | null> {
  const client = await getPortalClient()
  if (client) {
    return prisma.generatedSite.findFirst({
      where: { id: siteId, campagne: { clientId: client.id } },
      select: { id: true },
    })
  }

  const user = await getCurrentUser()
  if (user) {
    return prisma.generatedSite.findFirst({
      where: { id: siteId, campagne: { client: visibilityFilter(user) } },
      select: { id: true },
    })
  }

  return null
}
