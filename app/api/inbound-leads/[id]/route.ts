import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const ALLOWED = ['VALID', 'DUPLICATE', 'REJECTED'] as const
type Status = (typeof ALLOWED)[number]

// Changer le statut d'un lead reçu (ex: « Invalider » -> REJECTED, ou réactiver -> VALID).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const status = body.status as Status
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const lead = await prisma.inboundLead.findUnique({ where: { id } })
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  // On ne modifie pas un lead déjà facturé (cohérence comptable)
  if (lead.monthlyInvoiceId) {
    return NextResponse.json({ error: 'Lead déjà facturé, statut verrouillé' }, { status: 409 })
  }

  const updated = await prisma.inboundLead.update({ where: { id }, data: { status } })
  return NextResponse.json(updated)
}
