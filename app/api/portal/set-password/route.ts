import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { CLIENT_COOKIE, makeClientSessionValue } from '@/lib/clientSession'

export const runtime = 'nodejs'

// Définit (ou réinitialise) le mot de passe du client via un jeton de lien e-mail, puis le connecte.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const token = String(body.token ?? '')
  const password = String(body.password ?? '')

  if (password.length < 8) return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, { status: 400 })

  const row = await prisma.clientLoginToken.findUnique({
    where: { token },
    select: { id: true, clientId: true, expiresAt: true, usedAt: true },
  })
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Ce lien est invalide ou expiré. Redemandez-en un.' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  await prisma.$transaction([
    prisma.client.update({ where: { id: row.clientId }, data: { portalPassword: hashed } }),
    prisma.clientLoginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ])

  const res = NextResponse.json({ ok: true })
  res.cookies.set(CLIENT_COOKIE, makeClientSessionValue(row.clientId), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
