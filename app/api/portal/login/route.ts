import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateLoginToken, LOGIN_TOKEN_TTL_MIN } from '@/lib/clientSession'
import { sendClientLoginEmail } from '@/lib/mail'

export const runtime = 'nodejs'

function getOrigin(request: Request): string {
  const h = request.headers
  const proto = h.get('x-forwarded-proto') || 'https'
  const host = h.get('x-forwarded-host') || h.get('host') || 'monsieurlead.jboost.fr'
  return `${proto}://${host}`
}

// Envoie un lien magique de connexion au client dont l'e-mail est fourni.
// Réponse générique (on ne révèle jamais si l'e-mail existe → anti-énumération).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const generic = NextResponse.json({ ok: true })

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return generic

  // On compare en minuscules (les e-mails clients ne sont pas forcément normalisés en base).
  const clients = await prisma.client.findMany({ where: { archived: false }, select: { id: true, name: true, email: true } })
  const client = clients.find((c) => (c.email ?? '').trim().toLowerCase() === email)
  if (!client || !client.email) return generic

  const token = generateLoginToken()
  await prisma.clientLoginToken.create({
    data: { token, clientId: client.id, expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60 * 1000) },
  })

  const link = `${getOrigin(request)}/api/portal/verify?token=${token}`
  try {
    await sendClientLoginEmail({ to: client.email, clientName: client.name, link })
  } catch (e) {
    console.error('[portal-login] échec envoi:', (e as Error)?.message || e)
  }
  return generic
}
