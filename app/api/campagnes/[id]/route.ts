import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Récupère une campagne en vérifiant qu'elle appartient au périmètre de l'utilisateur (USER = ses clients, ADMIN = toutes).
async function findOwnedCampagne(id: string, user: { id: string; role: string }) {
  return prisma.campagne.findFirst({ where: { id, client: visibilityFilter(user) } })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedCampagne(id, user)
  if (!existing) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })

  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Nom obligatoire' }, { status: 400 })
    data.name = name
  }

  const campagne = await prisma.campagne.update({ where: { id }, data })
  return NextResponse.json(campagne)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Suppression réservée aux administrateurs' }, { status: 403 })
  }

  const { id } = await params
  const existing = await findOwnedCampagne(id, user)
  if (!existing) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })

  // Garde-fou : pas de suppression si un lead d'un site de cette campagne a déjà été facturé
  const billed = await prisma.inboundLead.count({
    where: { dossier: { campagneId: id }, monthlyInvoiceId: { not: null } },
  })
  if (billed > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${billed} lead(s) déjà facturé(s) dans cette campagne.` },
      { status: 409 },
    )
  }

  // Supprime la campagne (ses sites et leurs leads non facturés partent en cascade)
  await prisma.campagne.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
