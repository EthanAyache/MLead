import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

// Session du portail client : cookie httpOnly signé (HMAC) « clientId.expMs.signature ».
// Indépendant de NextAuth (qui gère les comptes admin/user).
export const CLIENT_COOKIE = 'ml_client_session'
const SESSION_DAYS = 30
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''

function hmac(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

// Valeur de cookie signée pour un client (valide SESSION_DAYS jours).
export function makeClientSessionValue(clientId: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  const payload = `${clientId}.${exp}`
  return `${payload}.${hmac(payload)}`
}

// Vérifie la signature + l'expiration. Retourne le clientId ou null.
export function verifyClientSessionValue(value: string | undefined | null): string | null {
  if (!value || !SECRET) return null
  const parts = value.split('.')
  if (parts.length !== 3) return null
  const [clientId, expStr, sig] = parts
  const expected = hmac(`${clientId}.${expStr}`)
  try {
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < Date.now()) return null
  return clientId
}

// Récupère le client connecté au portail (via le cookie signé), ou null.
export async function getPortalClient() {
  const store = await cookies()
  const clientId = verifyClientSessionValue(store.get(CLIENT_COOKIE)?.value)
  if (!clientId) return null
  return prisma.client.findFirst({ where: { id: clientId, archived: false } })
}

// Jeton de lien magique (usage unique).
export function generateLoginToken(): string {
  return randomBytes(24).toString('hex')
}
export const LOGIN_TOKEN_TTL_MIN = 30
