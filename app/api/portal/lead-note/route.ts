import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'

export const runtime = 'nodejs'

// Le client (portail) ajoute/modifie la note d'un de ses leads. body = { leadId, note }
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const leadId = String(body.leadId ?? '')
  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, dossier: { campagne: { clientId: client.id } } },
    select: { id: true },
  })
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })

  await prisma.inboundLead.update({ where: { id: lead.id }, data: { note: String(body.note ?? '').trim().slice(0, 2000) || null } })
  return NextResponse.json({ ok: true })
}
