import Stripe from 'stripe'
import { TVA_PERCENT } from '@/lib/tva'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY manquante dans .env')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-05-27.dahlia',
})

// Taux de TVA Stripe (20 %, « exclusif » = ajouté au montant HT des lignes). On réutilise le taux
// existant s'il y en a un, sinon on le crée une fois. La facture affiche alors HT + TVA + TTC.
let cachedVatRateId: string | null = null
export async function getVatRateId(): Promise<string> {
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