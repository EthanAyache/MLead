import type { Instrumentation } from 'next'

// Journal des erreurs serveur.
//
// Sur o2switch, Passenger n'écrit dans le log Apache que la pile d'appel, jamais le message :
// impossible de diagnostiquer une erreur 500 autrement. On écrit donc nous-mêmes, en clair,
// dans un fichier hors du dossier de l'application (UPLOADS_DIR, qui survit aux déploiements).
//
//   tail -n 40 ~/mlead-uploads/erreurs.log
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  try {
    const { appendFile, mkdir } = await import('fs/promises')
    const path = await import('path')

    const dir = process.env.UPLOADS_DIR || path.join(process.cwd(), '..', 'mlead-uploads')
    await mkdir(dir, { recursive: true })

    const e = err as { message?: string; stack?: string; digest?: string; code?: string }
    const bloc = [
      `--- ${new Date().toISOString()} ${request.method} ${request.path}`,
      `message : ${e?.message ?? String(err)}`,
      e?.code ? `code    : ${e.code}` : null,
      e?.digest ? `digest  : ${e.digest}` : null,
      e?.stack ? `pile    :\n${e.stack}` : null,
      '',
    ].filter(Boolean).join('\n')

    await appendFile(path.join(dir, 'erreurs.log'), bloc + '\n', 'utf8')
  } catch {
    // Journaliser ne doit jamais aggraver l'erreur d'origine.
  }
}
