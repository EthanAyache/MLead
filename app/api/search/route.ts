import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Recherche globale (barre du header) : clients + leads, dans le périmètre du user.
// GET /api/search?q=...  ->  { clients: [{id,name}], leads: [{id,name,siteId,clientName,campagneName,siteName}] }
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const q = (new URL(request.url).searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ clients: [], leads: [] })

  const filter = visibilityFilter(user)

  const [clients, leads] = await Promise.all([
    prisma.client.findMany({
      where: { archived: false, ...filter, OR: [{ name: { contains: q } }, { email: { contains: q } }] },
      orderBy: { name: 'asc' },
      take: 8,
      select: { id: true, name: true },
    }),
    prisma.inboundLead.findMany({
      where: {
        dossier: { campagne: { client: filter } },
        OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }],
      },
      orderBy: { receivedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        email: true,
        dossier: { select: { id: true, name: true, campagne: { select: { name: true, client: { select: { name: true } } } } } },
      },
    }),
  ])

  return NextResponse.json({
    clients: clients.map((c) => ({ id: c.id, name: c.name })),
    leads: leads.map((l) => ({
      id: l.id,
      name: l.name || l.email || 'Lead',
      siteId: l.dossier.id,
      clientName: l.dossier.campagne.client.name,
      campagneName: l.dossier.campagne.name,
      siteName: l.dossier.name,
    })),
  })
}
