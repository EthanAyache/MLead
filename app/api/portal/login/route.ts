import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { CLIENT_COOKIE, makeClientSessionValue } from '@/lib/clientSession'

export const runtime = 'nodejs'

// Connexion du client au portail : e-mail + mot de passe.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  const invalid = NextResponse.json({ error: 'E-mail ou mot de passe incorrect.' }, { status: 401 })
  if (!email || !password) return invalid

  // Les e-mails clients ne sont pas forcément normalisés en base → comparaison en minuscules.
  const clients = await prisma.client.findMany({
    where: { archived: false },
    select: { id: true, email: true, portalPassword: true },
  })
  const client = clients.find((c) => (c.email ?? '').trim().toLowerCase() === email)
  if (!client) return invalid

  if (!client.portalPassword) {
    return NextResponse.json({ error: "Aucun mot de passe défini. Utilisez « Première connexion / mot de passe oublié ».", code: 'NO_PASSWORD' }, { status: 403 })
  }

  const ok = await bcrypt.compare(password, client.portalPassword)
  if (!ok) return invalid

  const res = NextResponse.json({ ok: true })
  res.cookies.set(CLIENT_COOKIE, makeClientSessionValue(client.id), {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
  })
  return res
}
