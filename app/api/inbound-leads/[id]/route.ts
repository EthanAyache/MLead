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

  const lead = await prisma.inboundLead.findUnique({ where: { id } })
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  // On ne modifie pas un lead déjà facturé (cohérence comptable)
  if (lead.monthlyInvoiceId) {
    return NextResponse.json({ error: 'Lead déjà facturé, modification verrouillée' }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if ('status' in body) {
    const status = body.status as Status
    if (!ALLOWED.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }
    data.status = status
  }
  // Affectation à JBoost (c'est nous qui rappelons ce lead → exclu de la facture)
  if ('assignedToJboost' in body) {
    data.assignedToJboost = !!body.assignedToJboost
  }
  // Offre choisie par le lead (depuis la liste "À appeler"). '' / null = on déselectionne.
  if ('chosenOfferId' in body) {
    const offerId = body.chosenOfferId ? String(body.chosenOfferId) : null
    if (offerId) {
      const offer = await prisma.offer.findUnique({ where: { id: offerId } })
      // L'offre doit appartenir au site (dossier) de ce lead
      if (!offer || offer.dossierId !== lead.dossierId) {
        return NextResponse.json({ error: 'Offre invalide pour ce lead' }, { status: 400 })
      }
    }
    data.chosenOfferId = offerId
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Rien à modifier' }, { status: 400 })
  }

  const updated = await prisma.inboundLead.update({ where: { id }, data })
  return NextResponse.json(updated)
}
