import { NextResponse } from 'next/server'
import { CLIENT_COOKIE } from '@/lib/clientSession'
import { requestOrigin } from '@/lib/origin'

export const runtime = 'nodejs'

// Déconnexion du portail client : efface le cookie de session.
export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL('/login', requestOrigin(request)), 303)
  res.cookies.set(CLIENT_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
