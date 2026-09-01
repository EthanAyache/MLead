import { NextResponse } from 'next/server'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import { createGeneratedSite, siteUrl } from '@/lib/generatedSite'

// Mise en ligne de la page publique d'un site par l'équipe Mr.Lead (le client peut faire la même
// chose depuis son portail via /api/portal/sites). La page habille un site existant : elle ne
// touche ni à son prix, ni à sa formule, ni à son token.
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const result = await createGeneratedSite({
    clientWhere: visibilityFilter(user),
    dossierId: String(body.dossierId ?? ''),
    themeId: String(body.themeId ?? ''),
    periodId: String(body.periodId ?? ''),
    brandName: String(body.brandName ?? ''),
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  return NextResponse.json(
    { id: result.siteId, dossierId: result.dossierId, slug: result.slug, url: siteUrl(result.slug) },
    { status: 201 },
  )
}
