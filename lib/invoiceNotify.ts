import { stripe } from '@/lib/stripe'
import { sendInvoiceCopyToAdmin } from '@/lib/mail'

// Envoie la facture Stripe au client (e-mail Stripe) ET une copie interne à JBoost.
// Retourne la facture Stripe (avec hosted_invoice_url pour le lien de paiement).
export async function sendInvoiceToClientAndAdmin(invoiceId: string, ctx: { clientName: string; kind: string }) {
  const inv = await stripe.invoices.sendInvoice(invoiceId)
  const amountTTC = (inv.total ?? inv.amount_due ?? 0) / 100
  try {
    await sendInvoiceCopyToAdmin({
      clientName: ctx.clientName,
      kind: ctx.kind,
      amountTTC,
      hostedUrl: inv.hosted_invoice_url,
      pdfUrl: inv.invoice_pdf,
    })
  } catch (e) {
    console.error('[invoice-copy] échec envoi copie admin:', (e as Error)?.message || e)
  }
  return inv
}
