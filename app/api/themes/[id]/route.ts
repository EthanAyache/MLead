import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { normalizeFields } from '@/lib/themeFields'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
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

  const { id } = await params
  await prisma.theme.update({ where: { id }, data: { archived: true } })
  return NextResponse.json({ ok: true })
}
