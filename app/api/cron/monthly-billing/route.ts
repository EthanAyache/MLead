import { NextResponse } from 'next/server'
import { runMonthlyBilling } from '@/lib/billing'

export const runtime = 'nodejs'

// Endpoint de facturation mensuelle, déclenché par le cron o2switch le 28 :
//   GET /api/cron/monthly-billing?secret=XXXX
// proxy.ts exclut /api → route publique, protégée par CRON_SECRET (comme le token de l'ingest).
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET non configuré sur le serveur' }, { status: 500 })
  }
  const url = new URL(request.url)
  if ((url.searchParams.get('secret') || '') !== expected) {
    return NextResponse.json({ ok: false, error: 'secret invalide' }, { status: 401 })
  }

  // Période optionnelle "AAAA-MM" (défaut = mois courant). Utile pour (re)facturer un mois précis.
  const periodParam = url.searchParams.get('period')
  const period = periodParam && /^\d{4}-\d{2}$/.test(periodParam) ? periodParam : undefined

  const result = await runMonthlyBilling({ period })
  return NextResponse.json({ ok: true, ...result })
}
