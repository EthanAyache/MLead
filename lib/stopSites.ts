import { prisma } from '@/lib/prisma'
import { stripe, getVatRateId } from '@/lib/stripe'
import { hasUnpaidStopInvoice } from '@/lib/stopBilling'
import { sendInvoiceToClientAndAdmin } from '@/lib/invoiceNotify'

// Arrête (archive) un ou plusieurs sites d'un client. Pour les sites MENSUELS, émet une facture d'arrêt
// des leads non encore facturés (HT + TVA, payable carte + e-mail Stripe) → verrouille le compte tant
// qu'elle n'est pas réglée. Les sites PRÉPAYÉS sont juste archivés (déjà réglés via le solde).
export async function stopSitesForClient(clientId: string, dossierIds: string[]): Promise<{ ok: boolean; error?: string; payUrl?: string | null }> {
  if (await hasUnpaidStopInvoice(clientId)) {
    return { ok: false, error: "Une facture d'arrêt de ce client est déjà en attente de paiement." }
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, email: true, phone: true, stripeCustomerId: true },
  })
  if (!client) return { ok: false, error: 'Client introuvable' }

  const sites = await prisma.dossier.findMany({
    where: { id: { in: dossierIds }, archived: false, campagne: { clientId } },
    select: { id: true, name: true, unitPrice: true, billingMode: true },
  })
  if (sites.length === 0) return { ok: false, error: 'Sites introuvables' }
  const siteIds = sites.map((s) => s.id)
  const monthlySiteIds = sites.filter((s) => s.billingMode === 'MONTHLY').map((s) => s.id)

  let payUrl: string | null = null

  if (monthlySiteIds.length > 0) {
    const leads = await prisma.inboundLead.findMany({
      where: {
        status: 'VALID', assignedToJboost: false, monthlyInvoiceId: null, stopInvoiceId: null,
        dossierId: { in: monthlySiteIds },
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

    if (amount > 0) {
      if (!client.email) return { ok: false, error: 'Le client doit avoir un e-mail pour être facturé.' }
      try {
        let stripeCustomerId = client.stripeCustomerId
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({ name: client.name, email: client.email, phone: client.phone ?? undefined })
          stripeCustomerId = customer.id
          await prisma.client.update({ where: { id: client.id }, data: { stripeCustomerId } })
        }

        const stop = await prisma.stopInvoice.create({ data: { clientId: client.id, amount, currency: 'EUR', status: 'DRAFT' } })

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
        await sendInvoiceToClientAndAdmin(stripeInvoice.id, { clientName: client.name, kind: 'Arrêt de site' })
        payUrl = finalized.hosted_invoice_url ?? null
        await prisma.$transaction([
          prisma.inboundLead.updateMany({ where: { id: { in: leads.map((l) => l.id) } }, data: { stopInvoiceId: stop.id } }),
          prisma.stopInvoice.update({ where: { id: stop.id }, data: { status: 'SENT', payUrl } }),
        ])
      } catch (err) {
        return { ok: false, error: 'Stripe : ' + (err instanceof Error ? err.message : 'erreur') }
      }
    }
  }

  await prisma.dossier.updateMany({ where: { id: { in: siteIds } }, data: { archived: true } })
  return { ok: true, payUrl }
}

// Réactive un site archivé (impossible tant qu'une facture d'arrêt du client est impayée).
export async function reactivateSiteForClient(clientId: string, dossierId: string): Promise<{ ok: boolean; error?: string }> {
  if (await hasUnpaidStopInvoice(clientId)) {
    return { ok: false, error: "Une facture d'arrêt de ce client est en attente de paiement." }
  }
  const site = await prisma.dossier.findFirst({ where: { id: dossierId, archived: true, campagne: { clientId } }, select: { id: true } })
  if (!site) return { ok: false, error: 'Site introuvable' }
  await prisma.dossier.update({ where: { id: site.id }, data: { archived: false } })
  return { ok: true }
}
