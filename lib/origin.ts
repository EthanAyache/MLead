// Reconstruit l'URL publique (https://monsieurlead.jboost.fr) à partir des en-têtes du proxy o2switch.
// `request.url` derrière Passenger pointe sur l'adresse interne (localhost) → inutilisable pour rediriger.
export function requestOrigin(request: Request): string {
  const h = request.headers
  const proto = h.get('x-forwarded-proto') || 'https'
  const host = h.get('x-forwarded-host') || h.get('host') || 'monsieurlead.jboost.fr'
  return `${proto}://${host}`
}
