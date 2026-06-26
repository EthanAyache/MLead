import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function parseOffer(body: Record<string, unknown>) {
  const name = String(body.name ?? '').trim()
  const commissionType: 'PERCENT' | 'FIXED' = body.commissionType === 'FIXED' ? 'FIXED' : 'PERCENT'
  const commissionValue = parseFloat(String(body.commissionValue ?? '0'))
  const sellPrice = parseFloat(String(body.sellPrice ?? '0'))
  const depositRaw = String(body.deposit ?? '').trim()
  const deposit = depositRaw === '' ? null : parseFloat(depositRaw)
  return { name, commissionType, commissionValue, sellPrice, deposit }
}

// Crée une offre (contrat) sur un site.
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  if (!body.dossierId) return NextResponse.json({ error: 'Site obligatoire' }, { status: 400 })

  const site = await prisma.dossier.findUnique({ where: { id: body.dossierId } })
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const { name, commissionType, commissionValue, sellPrice, deposit } = parseOffer(body)
  if (!name) return NextResponse.json({ error: 'Nom du contrat obligatoire' }, { status: 400 })
  if (!(commissionValue >= 0)) return NextResponse.json({ error: 'Commission invalide' }, { status: 400 })
  if (!(sellPrice >= 0)) return NextResponse.json({ error: 'Prix de vente invalide' }, { status: 400 })
  if (deposit !== null && !(deposit >= 0)) return NextResponse.json({ error: 'Acompte invalide' }, { status: 400 })

  const offer = await prisma.offer.create({
    data: { dossierId: body.dossierId, name, commissionType, commissionValue, sellPrice, deposit },
  })
  return NextResponse.json(offer, { status: 201 })
}
