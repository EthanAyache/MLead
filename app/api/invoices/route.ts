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
    },
  })
  return NextResponse.json(invoices)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await request.json()

  if (!body.number) return NextResponse.json({ error: 'Numéro obligatoire' }, { status: 400 })
  if (!body.amount) return NextResponse.json({ error: 'Montant obligatoire' }, { status: 400 })
  if (!body.dueDate) return NextResponse.json({ error: 'Échéance obligatoire' }, { status: 400 })
  if (!body.clientId && !body.brandId) {
    return NextResponse.json({ error: 'Choisissez un client OU une brand' }, { status: 400 })
  }

  const due = new Date(body.dueDate)
  const status = due < new Date() ? 'LATE' : 'PENDING'
  const amount = parseFloat(body.amount)

  let stripeInvoiceId: string | null = null

  if (body.clientId) {
    try {
      const client = await prisma.client.findUnique({ where: { id: body.clientId } })
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
      clientId: body.clientId || null,
      brandId: body.brandId || null,
      stripeInvoiceId,
      userId: user.id,
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}