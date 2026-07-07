import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getPortalClient } from '@/lib/clientSession'

export const runtime = 'nodejs'

// Le client choisit l'e-mail (unique) où il reçoit ses leads (stocké dans Client.notifyEmails).
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide.' }, { status: 400 })
  }

  await prisma.client.update({ where: { id: client.id }, data: { notifyEmails: email } })
  return NextResponse.json({ ok: true })
}
