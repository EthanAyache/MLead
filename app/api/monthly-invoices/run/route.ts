import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { runMonthlyBilling } from '@/lib/billing'

export const runtime = 'nodejs'

// Déclenchement manuel de la facturation mensuelle (bouton admin du dashboard).
// Permet de tester / relancer sans attendre le cron du 28.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const result = await runMonthlyBilling()
  return NextResponse.json({ ok: true, ...result })
}
