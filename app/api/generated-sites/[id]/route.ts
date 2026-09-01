import { NextResponse } from 'next/server'
import { findEditableSite } from '@/lib/siteAccess'
import { prisma } from '@/lib/prisma'
import { updateGeneratedSiteContent } from '@/lib/generatedSite'
import { deleteUploadByUrl } from '@/lib/uploads'

// Enregistre le contenu d'une page publique (nom affiché, accroche, dates, présentation, photos).
// Accessible au client propriétaire depuis son portail comme à l'équipe depuis le back-office.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const site = await findEditableSite(id)
  if (!site) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const body = await request.json().catch(() => ({}))

  // Le droit de modification du client ne se change que depuis le back-office.
  if (body.clientCanEdit !== undefined) {
    if (!site.isAdmin) return NextResponse.json({ error: "Réservé à l'équipe Mr.Lead" }, { status: 403 })
    await prisma.generatedSite.update({ where: { id: site.id }, data: { clientCanEdit: Boolean(body.clientCanEdit) } })
    if (Object.keys(body).length === 1) return NextResponse.json({ ok: true })
  }

  const result = await updateGeneratedSiteContent(site.id, body)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  // Les fichiers des photos retirées ne sont effacés qu'une fois l'enregistrement réussi.
  await Promise.all(result.removedPhotos.map(deleteUploadByUrl))
  return NextResponse.json({ ok: true })
}
