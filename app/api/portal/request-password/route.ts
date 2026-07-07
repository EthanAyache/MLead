import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateLoginToken, LOGIN_TOKEN_TTL_MIN } from '@/lib/clientSession'
import { sendClientPasswordEmail } from '@/lib/mail'
import { requestOrigin } from '@/lib/origin'

export const runtime = 'nodejs'

// Envoie un lien de définition / réinitialisation du mot de passe au client dont l'e-mail est fourni.
// Réponse générique (anti-énumération). Sert à la première connexion ET au mot de passe oublié.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const generic = NextResponse.json({ ok: true })

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return generic

  const clients = await prisma.client.findMany({
    where: { archived: false },
    select: { id: true, name: true, email: true, portalPassword: true },
  })
  const client = clients.find((c) => (c.email ?? '').trim().toLowerCase() === email)
  if (!client || !client.email) return generic

  const token = generateLoginToken()
  await prisma.clientLoginToken.create({
    data: { token, clientId: client.id, expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MIN * 60 * 1000) },
  })

  const link = `${requestOrigin(request)}/portail/mot-de-passe?token=${token}`
  try {
    await sendClientPasswordEmail({ to: client.email, clientName: client.name, link, reset: !!client.portalPassword })
  } catch (e) {
    console.error('[portal-request-password] échec envoi:', (e as Error)?.message || e)
  }
  return generic
}
