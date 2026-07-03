import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { TVA_PERCENT } from '@/lib/tva'

// Taux de TVA Stripe (20 %, « exclusif » = ajouté au montant HT des lignes).
// On réutilise le taux existant s'il y en a un, sinon on le crée une fois. La facture
// Stripe affiche alors : lignes HT + TVA 20 % + total TTC (comme une vraie facture).
let cachedVatRateId: string | null = null
async function getVatRateId(): Promise<string> {
  if (cachedVatRateId) return cachedVatRateId
  const rates = await stripe.taxRates.list({ active: true, limit: 100 })
  const found = rates.data.find((r) => r.percentage === TVA_PERCENT && !r.inclusive && r.display_name === 'TVA')
  const id = found?.id ?? (await stripe.taxRates.create({
    display_name: 'TVA',
    description: `TVA ${TVA_PERCENT}%`,
    percentage: TVA_PERCENT,
    inclusive: false,
    country: 'FR',
  })).id
  cachedVatRateId = id
  return id
}

// Facturation mensuelle pay-per-lead.
// Pour chaque client : nb de leads facturables (VALID, non affectés à JBoost, pas déjà facturés)
// × prix unitaire du site → une facture Stripe (send_invoice, lien carte) émise le 28.
// Tant qu'elle n'est pas payée, l'ingest bloque l'envoi des nouveaux leads au client.

export type BillingClientResult = {
  clientId: string
  name: string
  leadCount: number
  amount: number
  status: 'ALREADY' | 'SKIPPED' | 'SENT' | 'FAILED'
  reason?: string
  monthlyInvoiceId?: string
  stripeInvoiceId?: string | null
}

export type BillingResult = {
  period: string
  results: BillingClientResult[]
}

// Période courante au format "AAAA-MM"
export function currentPeriod(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function runMonthlyBilling(opts?: { period?: string }): Promise<BillingResult> {
  const period = opts?.period ?? currentPeriod()

  // Pas de session côté cron → on facture tous les clients actifs.
  const clients = await prisma.client.findMany({
    where: { archived: false },
    select: { id: true, name: true, email: true, phone: true, stripeCustomerId: true },
    orderBy: { name: 'asc' },
  })

  const results: BillingClientResult[] = []

  for (const client of clients) {
    try {
      // 1. Idempotence : 1 facture par client et par période.
      //    Déjà SENT/PAID → on saute. DRAFT/FAILED (run précédent incomplet) → on rejoue.
      const existing = await prisma.monthlyInvoice.findUnique({
        where: { clientId_period: { clientId: client.id, period } },
        select: { id: true, status: true, stripeInvoiceId: true },
      })
      if (existing) {
        if (existing.status === 'SENT' || existing.status === 'PAID') {
          results.push({ clientId: client.id, name: client.name, leadCount: 0, amount: 0, status: 'ALREADY' })
          continue
        }
        // Run précédent incomplet (DRAFT/FAILED). Si une facture Stripe avait déjà été émise pour cette
        // période, on l'annule AVANT de rejouer : sinon une facture Stripe finalisée resterait due en plus
        // de la nouvelle → double facturation du client.
        if (existing.stripeInvoiceId) {
          try {
            await stripe.invoices.voidInvoice(existing.stripeInvoiceId)
          } catch {
            // Pas finalisée (encore un brouillon) ou déjà annulée : on tente une suppression, sinon on ignore.
            try { await stripe.invoices.del(existing.stripeInvoiceId) } catch { /* rien à faire */ }
          }
        }
        await prisma.monthlyInvoice.delete({ where: { id: existing.id } })
      }

      // 2. Leads facturables non encore facturés, sur tous les sites du client.
      const allLeads = await prisma.inboundLead.findMany({
        where: {
          status: 'VALID',
          assignedToJboost: false,
          monthlyInvoiceId: null,
          dossier: { campagne: { clientId: client.id } },
        },
        select: { id: true, dossier: { select: { id: true, name: true, unitPrice: true } } },
      })

      // Les sites à 0 € sortent de la facturation : leurs leads ne sont jamais facturés
      // (ils restent transmis au client par e-mail, mais n'apparaissent pas sur la facture).
      const leads = allLeads.filter((l) => l.dossier.unitPrice > 0)

      if (leads.length === 0) {
        const reason = allLeads.length === 0 ? 'aucun lead facturable' : 'aucun lead facturable (sites à 0 €)'
        results.push({ clientId: client.id, name: client.name, leadCount: 0, amount: 0, status: 'SKIPPED', reason })
        continue
      }

      // 3. Regroupement par site → montant = Σ (nb leads × prix unitaire du site).
      const perSite = new Map<string, { name: string; unitPrice: number; count: number }>()
      for (const l of leads) {
        const d = l.dossier
        const e = perSite.get(d.id) ?? { name: d.name, unitPrice: d.unitPrice, count: 0 }
        e.count += 1
        perSite.set(d.id, e)
      }
      const leadCount = leads.length
      const amount = [...perSite.values()].reduce((s, e) => s + e.count * e.unitPrice, 0)
      if (amount <= 0) {
        results.push({ clientId: client.id, name: client.name, leadCount, amount, status: 'SKIPPED', reason: 'montant nul (prix unitaire à 0)' })
        continue
      }

      // 4. Client Stripe (créé à la volée si besoin, comme dans /api/invoices).
      if (!client.email) {
        results.push({ clientId: client.id, name: client.name, leadCount, amount, status: 'FAILED', reason: 'client sans e-mail' })
        continue
      }
      let stripeCustomerId = client.stripeCustomerId
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name: client.name,
          email: client.email,
          phone: client.phone ?? undefined,
        })
        stripeCustomerId = customer.id
        await prisma.client.update({ where: { id: client.id }, data: { stripeCustomerId } })
      }

      // 5. Facture mensuelle en base (DRAFT le temps de traiter Stripe).
      const monthly = await prisma.monthlyInvoice.create({
        data: { clientId: client.id, period, leadCount, amount, currency: 'EUR', status: 'DRAFT' },
      })

      // 6. Facture Stripe : send_invoice (e-mail + lien « payer par carte »).
      try {
        const stripeInvoice = await stripe.invoices.create({
          customer: stripeCustomerId,
          collection_method: 'send_invoice',
          days_until_due: 7,
          metadata: { mrlead_monthly_period: period, mrlead_client_id: client.id },
        })
        if (!stripeInvoice.id) throw new Error("Stripe : pas d'ID de facture")

        // On mémorise l'ID Stripe immédiatement : si une étape suivante échoue, le prochain run saura
        // quelle facture Stripe annuler avant d'en réémettre une (garde-fou anti double facturation).
        await prisma.monthlyInvoice.update({
          where: { id: monthly.id },
          data: { stripeInvoiceId: stripeInvoice.id },
        })

        // Les prix par lead sont HT → on ajoute la TVA 20 % en ligne (HT + TVA + TTC sur la facture).
        const vatRateId = await getVatRateId()
        for (const e of perSite.values()) {
          await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            invoice: stripeInvoice.id,
            amount: Math.round(e.count * e.unitPrice * 100),
            currency: 'eur',
            description: `${e.count} lead${e.count > 1 ? 's' : ''} — ${e.name} (${period})`,
            tax_rates: [vatRateId],
          })
        }

        await stripe.invoices.finalizeInvoice(stripeInvoice.id)
        await stripe.invoices.sendInvoice(stripeInvoice.id)

        // 7. Lier les leads à la facture + passer SENT (atomique).
        await prisma.$transaction([
          prisma.inboundLead.updateMany({
            where: { id: { in: leads.map((l) => l.id) } },
            data: { monthlyInvoiceId: monthly.id },
          }),
          prisma.monthlyInvoice.update({
            where: { id: monthly.id },
            data: { stripeInvoiceId: stripeInvoice.id, status: 'SENT' },
          }),
        ])

        results.push({
          clientId: client.id, name: client.name, leadCount, amount,
          status: 'SENT', monthlyInvoiceId: monthly.id, stripeInvoiceId: stripeInvoice.id,
        })
      } catch (stripeErr) {
        // Stripe a échoué : on marque FAILED. Les leads n'ont PAS été liés → ils seront refacturés
        // au prochain run (la facture FAILED est supprimée/rejouée par l'idempotence ci-dessus).
        await prisma.monthlyInvoice.update({ where: { id: monthly.id }, data: { status: 'FAILED' } }).catch(() => {})
        results.push({
          clientId: client.id, name: client.name, leadCount, amount, status: 'FAILED',
          reason: stripeErr instanceof Error ? stripeErr.message : 'Erreur Stripe', monthlyInvoiceId: monthly.id,
        })
      }
    } catch (err) {
      results.push({
        clientId: client.id, name: client.name, leadCount: 0, amount: 0, status: 'FAILED',
        reason: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    }
  }

  return { period, results }
}
