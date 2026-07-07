import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'

export const runtime = 'nodejs'

// Le client change la formule d'UN de ses sites (Mensuel ou Prépayé). body = { dossierId, mode }
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (await hasUnpaidStopInvoice(client.id)) {
    return NextResponse.json({ error: 'Réglez d\'abord votre facture d\'arrêt en attente.' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({}))
  const dossierId = String(body.dossierId ?? '')
  const mode = body.mode
  if (mode !== 'MONTHLY' && mode !== 'PREPAID') return NextResponse.json({ error: 'Formule invalide' }, { status: 400 })

  const site = await prisma.dossier.findFirst({
    where: { id: dossierId, archived: false, campagne: { clientId: client.id } },
    select: { id: true },
  })
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  await prisma.dossier.update({ where: { id: site.id }, data: { billingMode: mode } })
  return NextResponse.json({ ok: true })
}
