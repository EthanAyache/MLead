import { readUpload } from '@/lib/uploads'

// Sert les photos des sites clients, stockées hors du dossier de l'application (voir lib/uploads.ts).
// Public : ces images s'affichent sur les pages publiques offreofficielle.fr.
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const file = await readUpload(path.join('/'))
  if (!file) return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(file.body), {
    headers: {
      'Content-Type': file.contentType,
      // Le nom du fichier est unique et n'est jamais réécrit : on peut cacher longtemps.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(file.body.length),
    },
  })
}
