import { NextResponse } from 'next/server'
import { CLIENT_COOKIE } from '@/lib/clientSession'

export const runtime = 'nodejs'

// Déconnexion du portail client : efface le cookie de session.
export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL('/portail/login', new URL(request.url).origin), 303)
  res.cookies.set(CLIENT_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return res
}
