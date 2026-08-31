import { mkdir, writeFile, readFile, unlink } from 'fs/promises'
import { randomBytes } from 'crypto'
import path from 'path'

// Les photos des sites clients sont écrites sur le disque, HORS du dossier de l'application :
// un redéploiement (git pull / rsync) remplace le dossier de l'app et effacerait tout upload
// qui y serait rangé. Sur o2switch, pointer UPLOADS_DIR sur ~/mlead-uploads.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'mlead-uploads')

// Un nom de fichier ne vient jamais de l'utilisateur (on le génère), mais l'URL publique
// est libre : on revalide chaque segment avant de toucher au disque.
const SEGMENT_RE = /^[A-Za-z0-9_-]+$/
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

// 5 Mo : les photos sont déjà redimensionnées dans le navigateur avant l'envoi (1600 px de large),
// cette limite ne sert qu'à borner un envoi anormal.
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

// Chemin disque d'un fichier « <dossier>/<nom>.<ext> », ou null si un segment est douteux.
function safePath(relative: string): string | null {
  const parts = relative.replace(/^\/+/, '').split('/')
  if (parts.length !== 2) return null
  const [dir, file] = parts
  const dot = file.lastIndexOf('.')
  if (dot < 1) return null
  const base = file.slice(0, dot)
  const ext = file.slice(dot + 1).toLowerCase()
  if (!SEGMENT_RE.test(dir) || !SEGMENT_RE.test(base) || !MIME_BY_EXT[ext]) return null
  return path.join(UPLOADS_DIR, dir, `${base}.${ext}`)
}

// Enregistre une image envoyée en dataURL (« data:image/jpeg;base64,… ») et renvoie son URL publique.
// Lève une erreur explicite si le format ou la taille ne convient pas.
export async function saveDataUrlImage(folder: string, dataUrl: string): Promise<string> {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? '').trim())
  if (!m) throw new Error('Format d’image non supporté (JPEG, PNG ou WebP attendu).')

  const buffer = Buffer.from(m[2], 'base64')
  if (buffer.length === 0) throw new Error('Image vide.')
  if (buffer.length > MAX_PHOTO_BYTES) throw new Error('Image trop lourde (5 Mo maximum).')
  if (!SEGMENT_RE.test(folder)) throw new Error('Destination invalide.')

  const name = `${Date.now().toString(36)}${randomBytes(4).toString('hex')}.${EXT_BY_MIME[m[1]]}`
  await mkdir(path.join(UPLOADS_DIR, folder), { recursive: true })
  await writeFile(path.join(UPLOADS_DIR, folder, name), buffer)
  return `/api/uploads/${folder}/${name}`
}

// Lit un fichier pour la route de service. Renvoie null si le chemin est invalide ou absent.
export async function readUpload(relative: string): Promise<{ body: Buffer; contentType: string } | null> {
  const full = safePath(relative)
  if (!full) return null
  try {
    const body = await readFile(full)
    const ext = full.slice(full.lastIndexOf('.') + 1).toLowerCase()
    return { body, contentType: MIME_BY_EXT[ext] }
  } catch {
    return null
  }
}

// Supprime un fichier à partir de son URL publique (/api/uploads/<dossier>/<nom>).
// Silencieux : une photo déjà absente ne doit pas faire échouer l'enregistrement de la page.
export async function deleteUploadByUrl(url: string): Promise<void> {
  const relative = String(url ?? '').replace(/^\/api\/uploads\//, '')
  const full = safePath(relative)
  if (!full) return
  try {
    await unlink(full)
  } catch {
    /* fichier déjà supprimé ou introuvable */
  }
}
