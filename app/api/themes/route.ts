import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60) || 'theme'
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nom du thème obligatoire' }, { status: 400 })

  const pricePerLead = parseFloat(body.pricePerLead)
  if (!(pricePerLead >= 0)) return NextResponse.json({ error: 'Prix par lead invalide' }, { status: 400 })

  // Paliers de remise (optionnels) : [{ minQty, pricePerLead }]
  const tiers = Array.isArray(body.tiers)
    ? body.tiers
        .map((t: { minQty: unknown; pricePerLead: unknown }) => ({
          minQty: parseInt(String(t.minQty), 10),
          pricePerLead: parseFloat(String(t.pricePerLead)),
        }))
        .filter((t: { minQty: number; pricePerLead: number }) => t.minQty > 0 && t.pricePerLead >= 0)
    : []

  // Slug unique
  let slug = slugify(name)
  const exists = await prisma.theme.findUnique({ where: { slug } })
  if (exists) slug = `${slug}-${Date.now().toString(36)}`

  const theme = await prisma.theme.create({
    data: {
      name,
      slug,
      description: body.description?.trim() || null,
      pricePerLead,
      currency: body.currency || 'EUR',
      userId: user.id,
      tiers: { create: tiers },
    },
    include: { tiers: true },
  })

  return NextResponse.json(theme, { status: 201 })
}
