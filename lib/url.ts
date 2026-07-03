// Normalise une URL saisie : vide → null, sinon ajoute https:// si le schéma manque.
// (ex. "monsite.fr" → "https://monsite.fr", "http://x.fr" inchangé)
export function normalizeUrl(raw: unknown): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}
