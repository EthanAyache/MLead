import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe, getVatRateId } from '@/lib/stripe'
import { getPortalClient } from '@/lib/clientSession'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'
import { sendStopSitesNoticeEmail } from '@/lib/mail'

export const runtime = 'nodejs'

// Le client arrête un ou plusieurs sites. Les sites sont archivés immédiatement (ils ne reçoivent plus
// de leads). En formule MENSUELLE, une facture d'arrêt couvre les leads reçus non encore facturés de
// ces sites → tant qu'elle n'est pas payée, le compte est verrouillé. En PRÉPAYÉ, pas de facture
// (leads déjà réglés via le solde). body = { dossierIds: string[], reason?: string, global?: boolean }
export async function POST(request: Request) {
  const client = await getPortalClient()
  if (!client) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // Verrou : on ne peut pas relancer un arrêt tant qu'une facture d'arrêt précédente n'est pas réglée.
  if (await hasUnpaidStopInvoice(client.id)) {
    return NextResponse.json({ error: 'Une facture d\'arrêt est déjà en attente de paiement. Réglez-la d\'abord.' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.dossierIds) ? body.dossierIds.map((x: unknown) => String(x)) : []
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 2000) || null : null
  const global = !!body.global
  if (ids.length === 0) return NextResponse.json({ error: 'Aucun site sélectionné' }, { status: 400 })

  // Sites du client, actifs et non déjà archivés.
  const sites = await prisma.dossier.findMany({
    where: { id: { in: ids }, archived: false, campagne: { clientId: client.id } },
    select: { id: true, name: true, unitPrice: true },
  })
  if (sites.length === 0) return NextResponse.json({ error: 'Sites introuvables' }, { status: 404 })
  const siteIds = sites.map((s) => s.id)

  const isMonthly = client.billingMode === 'MONTHLY'
  let payUrl: string | null = null

  if (isMonthly) {
    // Leads non encore facturés de ces sites (mêmes critères que la facturation mensuelle).
    const leads = await prisma.inboundLead.findMany({
      where: {
        status: 'VALID', assignedToJboost: false, monthlyInvoiceId: null, stopInvoiceId: null,
        dossierId: { in: siteIds },
      },
      select: { id: true, dossier: { select: { id: true, name: true, unitPrice: true } } },
    })

    const perSite = new Map<string, { name: string; unitPrice: number; count: number }>()
    for (const l of leads) {
      const d = l.dossier
      const e = perSite.get(d.id) ?? { name: d.name, unitPrice: d.unitPrice, count: 0 }
      e.count += 1
      perSite.set(d.id, e)
    }
    const amount = [...perSite.values()].reduce((s, e) => s + e.count * e.unitPrice, 0)

    // Facture d'arrêt seulement s'il y a un montant à régler.
    if (amount > 0) {
      if (!client.email) return NextResponse.json({ error: 'Aucun e-mail associé à votre compte' }, { status: 400 })
      try {
        let stripeCustomerId = client.stripeCustomerId
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({ name: client.name, email: client.email, phone: client.phone ?? undefined })
          stripeCustomerId = customer.id
          await prisma.client.update({ where: { id: client.id }, data: { stripeCustomerId } })
        }

        const stop = await prisma.stopInvoice.create({
          data: { clientId: client.id, amount, currency: 'EUR', status: 'DRAFT', reason },
        })

        const stripeInvoice = await stripe.invoices.create({
          customer: stripeCustomerId,
          collection_method: 'send_invoice',
          days_until_due: 7,
          metadata: { mrlead_stop_invoice: '1', mrlead_client_id: client.id },
        })
        if (!stripeInvoice.id) throw new Error("Stripe : pas d'ID de facture")
        await prisma.stopInvoice.update({ where: { id: stop.id }, data: { stripeInvoiceId: stripeInvoice.id } })

        const vatRateId = await getVatRateId()
        for (const e of perSite.values()) {
          await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            invoice: stripeInvoice.id,
            amount: Math.round(e.count * e.unitPrice * 100),
            currency: 'eur',
            description: `${e.count} lead${e.count > 1 ? 's' : ''} — ${e.name} (arrêt du site)`,
            tax_rates: [vatRateId],
          })
        }

        const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id)
        await stripe.invoices.sendInvoice(stripeInvoice.id) // envoi de la facture par e-mail Stripe (paiement carte)
        payUrl = finalized.hosted_invoice_url ?? null
        // Lier les leads à la facture d'arrêt + passer SENT + mémoriser le lien de paiement (atomique).
        await prisma.$transaction([
          prisma.inboundLead.updateMany({ where: { id: { in: leads.map((l) => l.id) } }, data: { stopInvoiceId: stop.id } }),
          prisma.stopInvoice.update({ where: { id: stop.id }, data: { status: 'SENT', payUrl } }),
        ])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur Stripe'
        return NextResponse.json({ error: 'Stripe : ' + message }, { status: 500 })
      }
    }
  }

  // Archivage immédiat des sites (ils cessent de recevoir des leads).
  await prisma.dossier.updateMany({ where: { id: { in: siteIds } }, data: { archived: true } })

  // Notifier JBoost (interne) avec la raison éventuelle.
  try {
    await sendStopSitesNoticeEmail({ clientName: client.name, siteNames: sites.map((s) => s.name), reason, global })
  } catch (e) {
    console.error('[stop-sites] échec e-mail notice:', (e as Error)?.message || e)
  }

  return NextResponse.json({ ok: true, payUrl })
}
