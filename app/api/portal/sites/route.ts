import { NextResponse } from 'next/server'
import { getPortalClient } from '@/lib/clientSession'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'
import { createGeneratedSite, siteUrl } from '@/lib/generatedSite'

// Génération de la page publique d'un site, par le client depuis son portail.
// Le site (prix par lead, formule) a été créé par l'admin : on ne fait qu'y attacher la page.
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Compte verrouillé par une facture d'arrêt impayée : même règle que le reste du portail.
  if (await hasUnpaidStopInvoice(client.id)) {
    return NextResponse.json(
      { error: "Une facture d'arrêt est en attente de paiement : réglez-la pour créer votre page." },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const result = await createGeneratedSite({
    clientWhere: { id: client.id },
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
