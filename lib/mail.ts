import nodemailer, { type Transporter } from 'nodemailer'

// Transporteur SMTP (o2switch). Configuré via les variables d'environnement :
//   SMTP_HOST, SMTP_PORT (465 SSL / 587 TLS), SMTP_USER, SMTP_PASS, MAIL_FROM
let cached: Transporter | null = null

function getTransporter(): Transporter | null {
  if (cached) return cached
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null
  const port = parseInt(process.env.SMTP_PORT || '465', 10)
  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL ; 587 = STARTTLS
    auth: { user, pass },
  })
  return cached
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// "a@x.fr, b@y.fr; c@z.fr" -> ['a@x.fr','b@y.fr','c@z.fr'] (emails valides uniquement)
export function parseRecipients(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s))
}

type LeadInfo = {
  name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  source?: string | null
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

// Envoie le lead par e-mail aux destinataires. Retourne false si SMTP non configuré / pas de destinataire.
export async function sendLeadEmail(opts: {
  to: string[]
  replyTo?: string
  siteName: string
  campagneName: string
  clientName: string
  lead: LeadInfo
}): Promise<boolean> {
  const t = getTransporter()
  if (!t || opts.to.length === 0) return false

  const from = process.env.MAIL_FROM || process.env.SMTP_USER
  const { lead } = opts
  const subject = `Nouveau lead — ${opts.campagneName} (${opts.siteName})`

  const lines = [
    ['Nom', lead.name],
    ['Email', lead.email],
    ['Téléphone', lead.phone],
    ['Message', lead.message],
    ['Source', lead.source],
  ].filter(([, v]) => v) as [string, string][]

  const text =
    `Nouveau lead reçu via MonsieurLead\n\nClient : ${opts.clientName}\nCampagne : ${opts.campagneName}\nSite : ${opts.siteName}\n\n` +
    lines.map(([k, v]) => `${k} : ${v}`).join('\n')

  const html = `
    <div style="font-family:Arial,sans-serif;color:#16171D">
      <h2 style="margin:0 0 4px">Nouveau lead reçu</h2>
      <p style="color:#787C8A;margin:0 0 16px">${escapeHtml(opts.clientName)} · ${escapeHtml(opts.campagneName)} · ${escapeHtml(opts.siteName)}</p>
      <table cellpadding="6" style="border-collapse:collapse">
        ${lines.map(([k, v]) => `<tr><td style="font-weight:bold;color:#414350">${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`).join('')}
      </table>
      <p style="color:#9aa;margin-top:16px;font-size:12px">Transféré automatiquement par MonsieurLead.</p>
    </div>`

  await t.sendMail({
    from,
    to: opts.to.join(', '),
    replyTo: opts.replyTo && EMAIL_RE.test(opts.replyTo) ? opts.replyTo : undefined,
    subject,
    text,
    html,
  })
  return true
}
