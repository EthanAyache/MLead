import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'

export const runtime = 'nodejs'

// Réactive un site archivé (il recommence à recevoir des leads). Impossible tant qu'une facture
// d'arrêt est en attente de paiement. body = { dossierId: string }
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  if (await hasUnpaidStopInvoice(client.id)) {
    return NextResponse.json({ error: 'Réglez d\'abord votre facture d\'arrêt en attente.' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({}))
  const dossierId = String(body.dossierId ?? '')
  const site = await prisma.dossier.findFirst({
    where: { id: dossierId, archived: true, campagne: { clientId: client.id } },
    select: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  await prisma.dossier.update({ where: { id: site.id }, data: { archived: false } })
  return NextResponse.json({ ok: true })
}
