import { NextResponse } from 'next/server'
import { getPortalClient } from '@/lib/clientSession'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'
import { createGeneratedSite, siteUrl } from '@/lib/generatedSite'

// Création d'un site par le client depuis son portail (bouton « Créer mon site »).
// Gratuite : la facturation reste au lead, via le Dossier créé en même temps.
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Compte verrouillé par une facture d'arrêt impayée : même règle que le reste du portail.
  if (await hasUnpaidStopInvoice(client.id)) {
    return NextResponse.json(
      { error: "Une facture d'arrêt est en attente de paiement : réglez-la pour créer un nouveau site." },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const result = await createGeneratedSite({
    clientId: client.id,
    campagneId: String(body.campagneId ?? ''),
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
