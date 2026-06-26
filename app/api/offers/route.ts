import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

// Crée une offre (contrat) sur un site appartenant à l'utilisateur.
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()
  if (!body.dossierId) return NextResponse.json({ error: 'Site obligatoire' }, { status: 400 })

  // Le site doit appartenir au périmètre de l'utilisateur (ADMIN voit tout).
  const site = await prisma.dossier.findFirst({
    where: { id: body.dossierId, campagne: { client: visibilityFilter(user) } },
  })
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Nom du contrat obligatoire' }, { status: 400 })

  if (body.commissionType !== undefined && !['PERCENT', 'FIXED'].includes(body.commissionType)) {
    return NextResponse.json({ error: 'Type de commission invalide' }, { status: 400 })
  }
  const commissionType: 'PERCENT' | 'FIXED' = body.commissionType === 'FIXED' ? 'FIXED' : 'PERCENT'
  const commissionValue = parseFloat(String(body.commissionValue ?? '0'))
  if (!(commissionValue >= 0)) return NextResponse.json({ error: 'Commission invalide' }, { status: 400 })
  if (commissionType === 'PERCENT' && commissionValue > 100) {
    return NextResponse.json({ error: 'Pourcentage > 100' }, { status: 400 })
  }
  const sellPrice = parseFloat(String(body.sellPrice ?? '0'))
  if (!(sellPrice >= 0)) return NextResponse.json({ error: 'Prix de vente invalide' }, { status: 400 })

  const depositRaw = String(body.deposit ?? '').trim()
  const deposit = depositRaw === '' ? null : parseFloat(depositRaw)
  if (deposit !== null && !(deposit >= 0)) return NextResponse.json({ error: 'Acompte invalide' }, { status: 400 })

  const offer = await prisma.offer.create({
    data: { dossierId: body.dossierId, name, commissionType, commissionValue, sellPrice, deposit },
  })
  return NextResponse.json(offer, { status: 201 })
}
