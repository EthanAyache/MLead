import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

export type SiteAccess = { id: string; isAdmin: boolean }

// Qui peut modifier la page d'un site :
//  - l'équipe Mr.Lead (session NextAuth), dans la limite de son périmètre, toujours ;
//  - le client propriétaire (session portail), seulement si l'équipe lui en a laissé le droit
//    (GeneratedSite.clientCanEdit).
// Renvoie null si l'appelant n'a pas le droit de modifier cette page.
export async function findEditableSite(siteId: string): Promise<SiteAccess | null> {
  const client = await getPortalClient()
  if (client) {
    const site = await prisma.generatedSite.findFirst({
      where: { id: siteId, dossier: { campagne: { clientId: client.id } } },
      select: { id: true, clientCanEdit: true },
    })
    return site?.clientCanEdit ? { id: site.id, isAdmin: false } : null
  }

  const user = await getCurrentUser()
  if (user) {
    const site = await prisma.generatedSite.findFirst({
      where: { id: siteId, dossier: { campagne: { client: visibilityFilter(user) } } },
      select: { id: true },
    })
    return site ? { id: site.id, isAdmin: true } : null
  }

  return null
}
