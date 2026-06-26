import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Nom du contrat obligatoire' }, { status: 400 })
    data.name = name
  }
  if (body.commissionType !== undefined) data.commissionType = body.commissionType === 'FIXED' ? 'FIXED' : 'PERCENT'
  if (body.commissionValue !== undefined) {
    const v = parseFloat(String(body.commissionValue))
    if (!(v >= 0)) return NextResponse.json({ error: 'Commission invalide' }, { status: 400 })
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
  // Si des leads ont choisi cette offre, on les détache (chosenOffer -> null) avant suppression.
  await prisma.inboundLead.updateMany({ where: { chosenOfferId: id }, data: { chosenOfferId: null } })
  await prisma.offer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
