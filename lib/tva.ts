// TVA française standard. Les prix des leads sont saisis et stockés HORS TAXE (HT) ;
// le TTC est calculé pour l'affichage, et la TVA est ajoutée en ligne sur la facture Stripe.
export const TVA_RATE = 0.2 // 20 %
export const TVA_PERCENT = 20

// HT → TTC (arrondi au centime)
export function ttcFromHt(ht: number): number {
  return Math.round(ht * (1 + TVA_RATE) * 100) / 100
}

// Formatage monétaire FR : 8 → "8,00 €"
export function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
