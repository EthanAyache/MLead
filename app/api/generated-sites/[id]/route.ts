import { NextResponse } from 'next/server'
import { findEditableSite } from '@/lib/siteAccess'
import { updateGeneratedSiteContent } from '@/lib/generatedSite'
import { deleteUploadByUrl } from '@/lib/uploads'

// Enregistre le contenu d'une page publique (nom affiché, accroche, dates, présentation, photos).
// Accessible au client propriétaire depuis son portail comme à l'équipe depuis le back-office.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const site = await findEditableSite(id)
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const result = await updateGeneratedSiteContent(site.id, body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  // Les fichiers des photos retirées ne sont effacés qu'une fois l'enregistrement réussi.
  await Promise.all(result.removedPhotos.map(deleteUploadByUrl))
  return NextResponse.json({ ok: true })
}
