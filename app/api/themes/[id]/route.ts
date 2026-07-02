import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { normalizeFields } from '@/lib/themeFields'

// Récupère un thème en vérifiant qu'il appartient au périmètre de l'utilisateur (USER = les siens, ADMIN = tous).
async function findOwnedTheme(id: string, user: { id: string; role: string }) {
  return prisma.theme.findFirst({ where: { id, ...visibilityFilter(user) } })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const existing = await findOwnedTheme(id, user)
  if (!existing) return NextResponse.json({ error: 'Thème introuvable' }, { status: 404 })

  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if ('description' in body) data.description = body.description?.trim() || null
  if (body.pricePerLead !== undefined) {
    const p = parseFloat(body.pricePerLead)
    if (!(p >= 0)) return NextResponse.json({ error: 'Prix par lead invalide' }, { status: 400 })
    data.pricePerLead = p
  }
  if (body.currency) data.currency = body.currency
  if ('fields' in body) data.fields = normalizeFields(body.fields)

  // Remplacement complet des paliers si fournis
  if (Array.isArray(body.tiers)) {
    const tiers = body.tiers
      .map((t: { minQty: unknown; pricePerLead: unknown }) => ({
        minQty: parseInt(String(t.minQty), 10),
        pricePerLead: parseFloat(String(t.pricePerLead)),
      }))
      .filter((t: { minQty: number; pricePerLead: number }) => t.minQty > 0 && t.pricePerLead >= 0)
    await prisma.priceTier.deleteMany({ where: { themeId: id } })
    data.tiers = { create: tiers }
  }

  const theme = await prisma.theme.update({
    where: { id },
    data,
    include: { tiers: true },
  })
  return NextResponse.json(theme)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Suppression réservée aux administrateurs
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Suppression réservée aux administrateurs' }, { status: 403 })
  }

  const { id } = await params

  const theme = await findOwnedTheme(id, user)
  if (!theme) return NextResponse.json({ error: 'Thème introuvable' }, { status: 404 })

  // Garde-fou : on n'efface jamais un thème dont des leads ont été vendus
  const soldCount = await prisma.prospect.count({ where: { themeId: id, status: 'SOLD' } })
  if (soldCount > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${soldCount} lead(s) ont déjà été vendu(s) dans ce thème.` },
      { status: 409 },
    )
  }

  // Suppression complète (les paliers et les leads en stock sont supprimés en cascade)
  await prisma.theme.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
