import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findEditableSite } from '@/lib/siteAccess'
import { MAX_PHOTOS, parsePhotos } from '@/lib/generatedSite'
import { saveDataUrlImage } from '@/lib/uploads'

// Réception d'une image envoyée par l'éditeur. Elle arrive en dataURL : le navigateur l'a déjà
// redimensionnée (voir SiteEditor), on la décode et on l'écrit sur le disque.
//
// target = 'gallery'      → ajoutée au carrousel du site (enregistrée aussitôt)
// target = 'presentation' → simplement stockée, l'éditeur l'insère dans le texte
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await findEditableSite(id)
  if (!access) return NextResponse.json({ error: 'Site introuvable' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const target = body.target === 'presentation' ? 'presentation' : 'gallery'

  const site = await prisma.generatedSite.findUnique({ where: { id: access.id }, select: { photos: true } })
  const photos = parsePhotos(site?.photos)
  if (target === 'gallery' && photos.length >= MAX_PHOTOS) {
    return NextResponse.json({ error: `Carrousel complet (${MAX_PHOTOS} photos maximum).` }, { status: 400 })
  }

  let url: string
  try {
    url = await saveDataUrlImage(access.id, String(body.dataUrl ?? ''))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Envoi impossible.' }, { status: 400 })
  }

  if (target === 'gallery') {
    const next = [...photos, url]
    await prisma.generatedSite.update({ where: { id: access.id }, data: { photos: next } })
    return NextResponse.json({ url, photos: next }, { status: 201 })
  }

  return NextResponse.json({ url }, { status: 201 })
}
