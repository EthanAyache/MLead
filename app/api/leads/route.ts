import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const leads = await prisma.lead.findMany({
    where: visibilityFilter(user),
    orderBy: { date: 'desc' },
    include: {
      brand: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(leads)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  if (!body.brandId) return NextResponse.json({ error: 'Brand obligatoire' }, { status: 400 })
  if (!body.clientId) return NextResponse.json({ error: 'Client obligatoire' }, { status: 400 })
  if (!body.buyPrice || parseFloat(body.buyPrice) < 0) {
    return NextResponse.json({ error: 'Prix d\'achat invalide' }, { status: 400 })
  }
  if (!body.sellPrice || parseFloat(body.sellPrice) < 0) {
    return NextResponse.json({ error: 'Prix de vente invalide' }, { status: 400 })
  }

  // La brand et le client doivent appartenir au périmètre de l'utilisateur (USER = les siens, ADMIN = tous).
  const brand = await prisma.brand.findFirst({ where: { id: body.brandId, ...visibilityFilter(user) } })
  if (!brand) return NextResponse.json({ error: 'Brand introuvable' }, { status: 404 })
  const client = await prisma.client.findFirst({ where: { id: body.clientId, ...visibilityFilter(user) } })
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const lead = await prisma.lead.create({
    data: {
      brandId: body.brandId,
      clientId: body.clientId,
      buyPrice: parseFloat(body.buyPrice),
      buyCurrency: body.buyCurrency || 'EUR',
      sellPrice: parseFloat(body.sellPrice),
      sellCurrency: body.sellCurrency || 'EUR',
      label: body.label || null,
      userId: user.id,
    },
  })
  return NextResponse.json(lead, { status: 201 })
}