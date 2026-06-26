import { randomBytes } from 'crypto'

// Token de dossier : 'ml_' + 32 caractères hexadécimaux (16 octets aléatoires sûrs).
export function generateDossierToken() {
  return 'ml_' + randomBytes(16).toString('hex')
}
