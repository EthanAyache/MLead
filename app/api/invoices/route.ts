import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const invoices = await prisma.invoice.findMany({
    where: { archived: false, ...visibilityFilter(user) },
    orderBy: { issueDate: 'desc' },
    include: {
      client: { select: { id: true, name: true } },
      brand: { select: { id: true, name: true } },
      apporteur: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(invoices)
}

// Chaque côté de la facture : CLIENT | BRAND | APPORTEUR | MRLEAD (Mr.Lead interne).
// L'option "mrlead" dans la liste des brands => Mr.Lead (type MRLEAD, sans FK).
function normalizeSide(type: string, id: string | null | undefined) {
  if (!id || id === 'mrlead') return { type: 'MRLEAD' as const, id: null }
  return { type, id }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()

  if (!body.number?.trim()) return NextResponse.json({ error: 'Numéro obligatoire' }, { status: 400 })
  if (!body.amount || parseFloat(body.amount) <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
  if (!body.dueDate) return NextResponse.json({ error: 'Échéance obligatoire' }, { status: 400 })

  const debtor = normalizeSide(body.debtorType, body.debtorId)
  const creditor = normalizeSide(body.creditorType, body.creditorId)

  // Débiteur et créditeur identiques ?
  if (debtor.type === creditor.type && debtor.id === creditor.id) {
    return NextResponse.json({ error: 'Le débiteur et le créditeur ne peuvent pas être identiques.' }, { status: 400 })
  }
  // On ne sait stocker qu'une entité par type (un seul clientId, brandId, apporteurId).
  if (debtor.type !== 'MRLEAD' && debtor.type === creditor.type) {
    return NextResponse.json({ error: 'Les deux côtés ne peuvent pas être du même type (ex : deux brands). Mets Mr.Lead d\'un côté.' }, { status: 400 })
  }
  if (debtor.type !== 'MRLEAD' && !debtor.id) return NextResponse.json({ error: 'Sélectionnez un débiteur' }, { status: 400 })
  if (creditor.type !== 'MRLEAD' && !creditor.id) return NextResponse.json({ error: 'Sélectionnez un créditeur' }, { status: 400 })

  // FK selon les types impliqués
  let clientId: string | null = null
  let brandId: string | null = null
  let apporteurId: string | null = null
  for (const side of [debtor, creditor]) {
    if (side.type === 'CLIENT') clientId = side.id
    if (side.type === 'BRAND') brandId = side.id
    if (side.type === 'APPORTEUR') apporteurId = side.id
  }

  const due = new Date(body.dueDate)
  const status = due < new Date() ? 'LATE' : 'PENDING'
  const amount = parseFloat(body.amount)

  // Stripe : le débiteur est celui qui paie. On crée une facture Stripe seulement
  // si le débiteur est un client (qui a un email).
  let stripeInvoiceId: string | null = null
  if (debtor.type === 'CLIENT' && clientId) {
    try {
      const client = await prisma.client.findUnique({ where: { id: clientId } })
      if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

      let stripeCustomerId = client.stripeCustomerId
      if (!stripeCustomerId) {
        if (!client.email) {
          return NextResponse.json({ error: 'Le client doit avoir un email' }, { status: 400 })
        }
        const customer = await stripe.customers.create({
          name: client.name,
          email: client.email,
          phone: client.phone ?? undefined,
        })
        stripeCustomerId = customer.id
        await prisma.client.update({ where: { id: client.id }, data: { stripeCustomerId } })
      }

      const stripeInvoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        collection_method: 'send_invoice',
        days_until_due: Math.max(1, Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
        metadata: { mrlead_invoice_number: body.number },
      })

      if (!stripeInvoice.id) throw new Error('Stripe : pas d\'ID de facture')

      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: stripeInvoice.id,
        amount: Math.round(amount * 100),
        currency: (body.currency || 'EUR').toLowerCase(),
        description: body.label || `Facture ${body.number}`,
      })

      await stripe.invoices.finalizeInvoice(stripeInvoice.id)
      await stripe.invoices.sendInvoice(stripeInvoice.id)

      stripeInvoiceId = stripeInvoice.id
    } catch (err) {
      console.error('Erreur Stripe:', err)
      const message = err instanceof Error ? err.message : 'Erreur Stripe'
      return NextResponse.json({ error: 'Stripe : ' + message }, { status: 500 })
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      number: body.number,
      amount,
      currency: body.currency || 'EUR',
      status,
      dueDate: due,
      debtorType: debtor.type,
      creditorType: creditor.type,
      clientId,
      brandId,
      apporteurId,
      stripeInvoiceId,
      userId: user.id,
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}
