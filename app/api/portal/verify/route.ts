import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CLIENT_COOKIE, makeClientSessionValue } from '@/lib/clientSession'
import { requestOrigin } from '@/lib/origin'

export const runtime = 'nodejs'

// Vérifie le jeton du lien magique, ouvre la session client (cookie signé), redirige vers le portail.
export async function GET(request: Request) {
  const origin = requestOrigin(request)
  const token = new URL(request.url).searchParams.get('token') || ''
  const fail = NextResponse.redirect(new URL('/portail/login?error=lien', origin))

  if (!token) return fail

  const row = await prisma.clientLoginToken.findUnique({ where: { token }, select: { id: true, clientId: true, expiresAt: true, usedAt: true } })
  if (!row || row.usedAt || row.expiresAt < new Date()) return fail

  // Usage unique
  await prisma.clientLoginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } })

  const res = NextResponse.redirect(new URL('/portail', origin))
  res.cookies.set(CLIENT_COOKIE, makeClientSessionValue(row.clientId), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
