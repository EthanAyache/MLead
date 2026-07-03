// Champs supplémentaires d'un lead (tout ce que le formulaire envoie en plus de
// nom/email/téléphone/message/source) : { [clé]: valeur }. Stocké en JSON sur InboundLead.

// Convertit une valeur JSON (Prisma) en { [clé]: string } propre, ou null si vide/invalide.
export function coerceExtra(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const s = String(val ?? '').trim()
    if (s) out[k] = s
  }
  return Object.keys(out).length ? out : null
}

// Rend une clé technique lisible : "ville_depart" → "Ville depart", "dateRetour" → "Date retour".
export function prettyFieldLabel(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
