import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'

export const runtime = 'nodejs'

// Le client change sa formule depuis le portail. Pour l'instant : passer en facturation MENSUELLE.
// (Passer en PREPAID se fait en achetant un pack via /api/portal/recharge.)
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body.mode !== 'MONTHLY') return NextResponse.json({ error: 'Formule invalide' }, { status: 400 })

  await prisma.client.update({ where: { id: client.id }, data: { billingMode: 'MONTHLY' } })
  return NextResponse.json({ ok: true })
}
