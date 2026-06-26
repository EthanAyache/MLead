import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Récupère une offre en vérifiant qu'elle appartient au périmètre de l'utilisateur.
async function findOwnedOffer(id: string, user: { id: string; role: string }) {
  return prisma.offer.findFirst({
    where: { id, dossier: { campagne: { client: visibilityFilter(user) } } },
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedOffer(id, user)
  if (!existing) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Nom du contrat obligatoire' }, { status: 400 })
    data.name = name
  }
  if (body.commissionType !== undefined) {
    if (!['PERCENT', 'FIXED'].includes(body.commissionType)) {
      return NextResponse.json({ error: 'Type de commission invalide' }, { status: 400 })
    }
    data.commissionType = body.commissionType
  }
  if (body.commissionValue !== undefined) {
    const v = parseFloat(String(body.commissionValue))
    if (!(v >= 0)) return NextResponse.json({ error: 'Commission invalide' }, { status: 400 })
    // Type final = celui éventuellement modifié dans ce PATCH, sinon l'actuel
    const finalType = (data.commissionType as string) ?? existing.commissionType
    if (finalType === 'PERCENT' && v > 100) return NextResponse.json({ error: 'Pourcentage > 100' }, { status: 400 })
    data.commissionValue = v
  }
  if (body.sellPrice !== undefined) {
    const v = parseFloat(String(body.sellPrice))
    if (!(v >= 0)) return NextResponse.json({ error: 'Prix de vente invalide' }, { status: 400 })
    data.sellPrice = v
  }
  if ('deposit' in body) {
    const raw = String(body.deposit ?? '').trim()
    if (raw === '') {
      data.deposit = null
    } else {
      const v = parseFloat(raw)
      if (!(v >= 0)) return NextResponse.json({ error: 'Acompte invalide' }, { status: 400 })
      data.deposit = v
    }
  }

  const offer = await prisma.offer.update({ where: { id }, data })
  return NextResponse.json(offer)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedOffer(id, user)
  if (!existing) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  // La relation N-N (chosenOffers) est nettoyée automatiquement par la table de jonction.
  await prisma.offer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
