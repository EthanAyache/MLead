import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { stopSitesForClient } from '@/lib/stopSites'

export const runtime = 'nodejs'

// Admin : arrête (archive) un site + facture d'arrêt si mensuel. POST /api/dossiers/[id]/stop
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const dossier = await prisma.dossier.findFirst({
    where: { id, campagne: { client: visibilityFilter(user) } },
    select: { id: true, campagne: { select: { clientId: true } } },
  })
  if (!dossier) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const result = await stopSitesForClient(dossier.campagne.clientId, [dossier.id])
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, payUrl: result.payUrl ?? null })
}
