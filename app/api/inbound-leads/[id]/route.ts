import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

const ALLOWED = ['VALID', 'DUPLICATE', 'REJECTED'] as const
type Status = (typeof ALLOWED)[number]

// Récupère un lead en vérifiant qu'il appartient bien au périmètre de l'utilisateur (USER = ses clients).
async function findOwnedLead(id: string, user: { id: string; role: string }) {
  return prisma.inboundLead.findFirst({
    where: { id, dossier: { campagne: { client: visibilityFilter(user) } } },
  })
}

// Modifier un lead : statut, affectation JBoost, offres choisies.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const lead = await findOwnedLead(id, user)
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  if (lead.monthlyInvoiceId) {
    return NextResponse.json({ error: 'Lead déjà facturé, modification verrouillée' }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if ('status' in body) {
    const status = body.status as Status
    if (!ALLOWED.includes(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    data.status = status
  }

  // Affectation à JBoost (exclut le lead de la facture). Si on le rend au client, on efface les offres choisies.
  let returnedToClient = false
  if ('assignedToJboost' in body) {
    data.assignedToJboost = !!body.assignedToJboost
    if (!body.assignedToJboost) {
      data.chosenOffers = { set: [] }
      returnedToClient = true
    }
  }

  // Offres choisies par le lead (plusieurs possibles). Doivent appartenir au site du lead.
  if (!returnedToClient && 'chosenOfferIds' in body) {
    const ids: string[] = Array.isArray(body.chosenOfferIds) ? body.chosenOfferIds.map((x: unknown) => String(x)) : []
    if (ids.length > 0) {
      const offers = await prisma.offer.findMany({ where: { id: { in: ids } } })
      if (offers.length !== ids.length || offers.some((o) => o.dossierId !== lead.dossierId)) {
        return NextResponse.json({ error: 'Offre invalide pour ce lead' }, { status: 400 })
      }
    }
    data.chosenOffers = { set: ids.map((id) => ({ id })) }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Rien à modifier' }, { status: 400 })
  }

  const updated = await prisma.inboundLead.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// Suppression définitive d'un lead (utilisé surtout pour effacer un doublon).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const lead = await findOwnedLead(id, user)
  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
  if (lead.monthlyInvoiceId) {
    return NextResponse.json({ error: 'Lead déjà facturé, suppression impossible' }, { status: 409 })
  }

  await prisma.inboundLead.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
