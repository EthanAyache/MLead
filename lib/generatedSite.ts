import sanitizeHtml from 'sanitize-html'
import { prisma } from '@/lib/prisma'
import { SITES_DOMAIN } from '@/lib/siteHost'

// Réexporté pour que les pages n'aient qu'un seul module à connaître.
export { SITES_DOMAIN }

// URL publique d'un site à partir de son slug.
export function siteUrl(slug: string): string {
  const proto = SITES_DOMAIN.includes('localhost') ? 'http' : 'https'
  return `${proto}://${slug}.${SITES_DOMAIN}`
}

// « Voyage Cacher » → « voyage-cacher ». Accents retirés, tout ce qui n'est pas [a-z0-9] devient un tiret.
export function slugify(raw: string): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// Slug complet du sous-domaine : thème + nom de l'offre + période.
// Ex. ('voyage-cacher', 'Loisirel', 'souccot') → 'voyage-cacher-loisirel-souccot'
export function buildSiteSlug(themeSlug: string, brandName: string, periodSlug: string): string {
  return [themeSlug, slugify(brandName), periodSlug].filter(Boolean).join('-')
}

// Rend le slug unique : si « voyage-cacher-loisirel-souccot » existe déjà, essaie -2, -3…
export async function uniqueSiteSlug(base: string): Promise<string> {
  let slug = base
  for (let n = 2; await prisma.generatedSite.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`
  }
  return slug
}

// Le contenu de la présentation est écrit dans un éditeur riche (contenteditable) puis republié
// sur un domaine public : il DOIT être assaini côté serveur, sinon un client peut injecter du script.
const PRESENTATION_RULES: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr', 'div', 'span', 'font',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    font: ['color', 'size', 'face'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\(/i],
      'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\(/i],
      'text-align': [/^(left|right|center|justify)$/],
      'font-weight': [/^(bold|normal|\d{3})$/],
      'font-style': [/^(italic|normal)$/],
      'text-decoration': [/^[a-z- ]+$/],
    },
  },
  // Liens : uniquement http(s), mailto et tel, et jamais de fenêtre sans rel="noopener".
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
    // Les images doivent venir de nos propres uploads : on jette toute autre source
    // (data: qui gonflerait la page, ou domaine externe non maîtrisé).
    img: (tagName, attribs) => {
      const src = attribs.src ?? ''
      const gardee: Record<string, string> = src.startsWith('/api/uploads/') ? { src, alt: attribs.alt ?? '' } : {}
      return { tagName, attribs: gardee }
    },
  },
  // Une balise vidée de sa source ne doit pas laisser une image cassée.
  exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
}

// HTML de présentation nettoyé, prêt à être stocké puis affiché tel quel.
export function sanitizePresentation(html: unknown): string {
  return sanitizeHtml(String(html ?? ''), PRESENTATION_RULES).trim()
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

// « Du 12 au 19 octobre 2026 » (mois et année factorisés quand ils sont identiques).
// Retourne null s'il manque une date : l'en-tête masque alors la ligne.
export function formatDateRange(start: Date | null, end: Date | null): string | null {
  if (!start && !end) return null
  if (!start || !end) {
    const d = (start ?? end) as Date
    return `À partir du ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
  }
  const memeAnnee = start.getFullYear() === end.getFullYear()
  const memeMois = memeAnnee && start.getMonth() === end.getMonth()
  const debut = memeMois
    ? `${start.getDate()}`
    : `${start.getDate()} ${MOIS[start.getMonth()]}${memeAnnee ? '' : ' ' + start.getFullYear()}`
  return `Du ${debut} au ${end.getDate()} ${MOIS[end.getMonth()]} ${end.getFullYear()}`
}

// Photos stockées en Json : on ne garde que des chemins d'upload valides.
export function parsePhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((p): p is string => typeof p === 'string' && p.startsWith('/api/uploads/'))
}

// Contenu de départ du bloc « Présentation », personnalisé avec les choix du client.
// Il est modifiable immédiatement depuis le portail.
export function defaultPresentation(brandName: string, themeName: string, periodName: string): string {
  return [
    `<h2>${escapeText(brandName)}</h2>`,
    `<h3>${escapeText(themeName)} — ${escapeText(periodName)}</h3>`,
    '<p>Présentez votre offre en quelques lignes : le programme, l’hébergement, ce qui est inclus.</p>',
    '<ul><li>Premier point à mettre en avant</li><li>Deuxième point à mettre en avant</li><li>Troisième point à mettre en avant</li></ul>',
    '<p>Laissez vos coordonnées dans le formulaire ci-dessus : un conseiller vous rappelle sous 24 h.</p>',
  ].join('')
}

function escapeText(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
}

// Adresse qui reçoit la copie JBoost de chaque lead, si rien n'est configuré ailleurs.
export const JBOOST_EMAIL = process.env.JBOOST_EMAIL || 'agencejboost@gmail.com'

// Liste de destinataires d'un site fraîchement créé, au format attendu par lib/mail
// (JSON [{ label, email }] ; un libellé contenant « jboost » vaut copie JBoost).
export function defaultNotifyEmails(clientEmail: string | null): string {
  const liste = [
    ...(clientEmail ? [{ label: 'Mail client', email: clientEmail }] : []),
    { label: 'Mail JBoost', email: JBOOST_EMAIL },
  ]
  return JSON.stringify(liste)
}

export type CreateSiteInput = {
  clientId: string
  // Le site (Dossier) que la page va habiller. Il existe déjà : c'est l'admin qui l'a créé,
  // avec son prix par lead et sa formule.
  dossierId: string
  themeId: string
  periodId: string
  brandName: string
}

export type CreateSiteResult =
  | { ok: true; slug: string; siteId: string; dossierId: string }
  | { ok: false; error: string }

// Crée en une fois : le Dossier Mr.Lead (qui porte le token d'ingestion et la facturation)
// et sa page publique. C'est ce que déclenche le bouton « Créer mon site » du portail.
export async function createGeneratedSite(input: CreateSiteInput): Promise<CreateSiteResult> {
  const brandName = String(input.brandName ?? '').trim().replace(/\s+/g, ' ')
  if (brandName.length < 2) return { ok: false, error: "Le nom de l'offre doit faire au moins 2 caractères." }
  if (brandName.length > 60) return { ok: false, error: "Le nom de l'offre est trop long (60 caractères maximum)." }
  if (!slugify(brandName)) return { ok: false, error: "Le nom de l'offre doit contenir des lettres ou des chiffres." }

  // Le site doit appartenir au client, être actif, et n'avoir pas déjà sa page.
  const dossier = await prisma.dossier.findFirst({
    where: { id: input.dossierId, archived: false, campagne: { clientId: input.clientId } },
    select: { id: true, websiteUrl: true, generatedSite: { select: { id: true } } },
  })
  if (!dossier) return { ok: false, error: 'Site introuvable.' }
  if (dossier.generatedSite) return { ok: false, error: 'Ce site a déjà sa page.' }

  const theme = await prisma.siteTheme.findFirst({ where: { id: input.themeId, active: true } })
  if (!theme) return { ok: false, error: 'Thème indisponible.' }
  const period = await prisma.sitePeriod.findFirst({ where: { id: input.periodId, active: true } })
  if (!period) return { ok: false, error: 'Période indisponible.' }

  const slug = await uniqueSiteSlug(buildSiteSlug(theme.slug, brandName, period.slug))

  try {
    const site = await prisma.generatedSite.create({
      data: {
        slug,
        dossierId: dossier.id,
        themeId: theme.id,
        periodId: period.id,
        brandName,
        presentationHtml: defaultPresentation(brandName, theme.name, period.name),
        photos: [],
      },
      select: { id: true },
    })

    // Le lien du site devient la page publique — sauf si l'admin en avait déjà renseigné un
    // (site externe existant) : on ne l'écrase pas.
    if (!dossier.websiteUrl) {
      await prisma.dossier.update({ where: { id: dossier.id }, data: { websiteUrl: siteUrl(slug) } })
    }

    return { ok: true, slug, siteId: site.id, dossierId: dossier.id }
  } catch {
    // Collision sur une contrainte unique (deux créations simultanées sur le même site ou le
    // même slug) : on demande simplement de réessayer plutôt que de créer un doublon.
    return { ok: false, error: 'La création a échoué, réessayez.' }
  }
}

// Nombre maximum de photos dans le carrousel d'un site.
export const MAX_PHOTOS = 20

// Une date d'un champ <input type="date"> (« 2026-10-05 ») → Date, ou null si vide/invalide.
function parseDateInput(value: unknown): Date | null {
  const s = String(value ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00Z`) // midi UTC : évite tout décalage de jour selon le fuseau
  return Number.isNaN(d.getTime()) ? null : d
}

export type UpdateSiteInput = {
  brandName?: unknown
  offerTitle?: unknown
  startDate?: unknown
  endDate?: unknown
  presentationHtml?: unknown
  photos?: unknown
}

// Enregistre le contenu d'une page (portail client ou back-office admin : l'appelant a déjà
// vérifié les droits). Le slug (donc l'adresse du site) n'est jamais modifié après création.
export async function updateGeneratedSiteContent(siteId: string, input: UpdateSiteInput) {
  const current = await prisma.generatedSite.findUnique({
    where: { id: siteId },
    select: { id: true, photos: true },
  })
  if (!current) return { ok: false as const, error: 'Site introuvable.' }

  const data: {
    brandName?: string; offerTitle?: string | null
    startDate?: Date | null; endDate?: Date | null
    presentationHtml?: string | null; photos?: string[]
  } = {}

  if (input.brandName !== undefined) {
    const name = String(input.brandName).trim().replace(/\s+/g, ' ')
    if (name.length < 2 || name.length > 60) {
      return { ok: false as const, error: "Le nom affiché doit faire entre 2 et 60 caractères." }
    }
    data.brandName = name
  }

  if (input.offerTitle !== undefined) {
    const title = String(input.offerTitle ?? '').trim().slice(0, 120)
    data.offerTitle = title || null
  }

  if (input.startDate !== undefined) data.startDate = parseDateInput(input.startDate)
  if (input.endDate !== undefined) data.endDate = parseDateInput(input.endDate)
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    return { ok: false as const, error: 'La date de fin doit suivre la date de début.' }
  }

  if (input.presentationHtml !== undefined) {
    const html = sanitizePresentation(input.presentationHtml)
    data.presentationHtml = html || null
  }

  let retirees: string[] = []
  if (input.photos !== undefined) {
    const photos = parsePhotos(input.photos).slice(0, MAX_PHOTOS)
    // Les photos retirées de la liste sont effacées du disque : sans ça, chaque suppression
    // laisserait un fichier orphelin que plus rien ne référence.
    retirees = parsePhotos(current.photos).filter((p) => !photos.includes(p))
    data.photos = photos
  }

  await prisma.generatedSite.update({ where: { id: siteId }, data })
  return { ok: true as const, removedPhotos: retirees }
}
