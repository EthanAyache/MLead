// Reconstruit l'URL publique (https://monsieurlead.jboost.fr) à partir des en-têtes du proxy o2switch.
// `request.url` derrière Passenger pointe sur l'adresse interne (localhost) → inutilisable pour rediriger.
export function requestOrigin(request: Request): string {
  const h = request.headers
  // Ces en-têtes peuvent contenir PLUSIEURS valeurs (« https, https ») quand il y a plusieurs proxys.
  // On ne garde que la première.
  const first = (v: string | null) => (v || '').split(',')[0].trim()
  const proto = first(h.get('x-forwarded-proto')) || 'https'
  const host = first(h.get('x-forwarded-host')) || first(h.get('host')) || 'monsieurlead.jboost.fr'
  return `${proto}://${host}`
}
