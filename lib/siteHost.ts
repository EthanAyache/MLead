// Résolution du sous-domaine des sites clients. Volontairement SANS aucune dépendance
// (ni Prisma, ni next) : ce module est importé par proxy.ts, qui tourne avant l'application.

// Domaine qui héberge les sites clients générés (un sous-domaine par site).
// Surchargeable pour tester en local : SITES_DOMAIN=offreofficiel.localhost:3000
export const SITES_DOMAIN = process.env.SITES_DOMAIN || 'offreofficielle.fr'

// Derrière le proxy o2switch, `host` vaut l'adresse interne : c'est x-forwarded-host qui porte le
// domaine demandé. Ces en-têtes peuvent contenir plusieurs valeurs (« a, b ») : on garde la première.
export function resolveHost(forwardedHost: string | null, host: string | null): string {
  return (forwardedHost || host || '').split(',')[0].trim().toLowerCase()
}

// « voyage-cacher-loisirel-souccot.offreofficielle.fr » → « voyage-cacher-loisirel-souccot ».
// Renvoie null pour le domaine nu, pour www, pour un sous-sous-domaine et pour tout autre
// domaine (= l'application Mr.Lead elle-même).
export function siteSlugFromHost(host: string): string | null {
  if (!host.endsWith(`.${SITES_DOMAIN}`)) return null
  const sub = host.slice(0, -(SITES_DOMAIN.length + 1))
  if (!sub || sub === 'www' || sub.includes('.')) return null
  return /^[a-z0-9-]+$/.test(sub) ? sub : null
}
