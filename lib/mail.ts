import nodemailer, { type Transporter } from 'nodemailer'
import { prettyFieldLabel } from '@/lib/leadExtra'

// Transporteur SMTP (Gmail : smtp.gmail.com, mot de passe d'application). Configuré via les variables
// d'environnement : SMTP_HOST, SMTP_PORT (465 SSL / 587 TLS), SMTP_USER, SMTP_PASS, MAIL_FROM
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

// Accepte deux formats :
//   - JSON : [{ label, email }, ...]  (nouveau format avec libellés)
//   - texte : "a@x.fr, b@y.fr; c@z.fr"  (ancien format)
// Retourne la liste des e-mails valides.
export function parseRecipients(raw: string | null | undefined): string[] {
  if (!raw) return []
  const s = raw.trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) {
        return arr
          .map((e) => String((e as { email?: unknown })?.email ?? '').trim())
          .filter((e) => EMAIL_RE.test(e))
      }
    } catch {
      // pas du JSON valide → on retombe sur le parsing texte
    }
  }
  return s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter((x) => EMAIL_RE.test(x))
}

// Comme parseRecipients, mais sépare les destinataires selon leur label :
//   - label contenant "jboost" (ex. "Mail JBoost") → jboost
//   - tous les autres (Mail client, libellés personnalisés, ancien format texte) → client
export function parseLabeledRecipients(raw: string | null | undefined): { jboost: string[]; client: string[] } {
  const jboost: string[] = []
  const client: string[] = []
  if (!raw) return { jboost, client }
  const s = raw.trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) {
        for (const e of arr) {
          const email = String((e as { email?: unknown })?.email ?? '').trim()
          if (!EMAIL_RE.test(email)) continue
          const label = String((e as { label?: unknown })?.label ?? '')
          if (/jboost/i.test(label)) jboost.push(email)
          else client.push(email)
        }
        return { jboost, client }
      }
    } catch {
      // pas du JSON valide → parsing texte ci-dessous (tout en "client")
    }
  }
  for (const x of s.split(/[,;\n]/).map((v) => v.trim()).filter((v) => EMAIL_RE.test(v))) {
    client.push(x)
  }
  return { jboost, client }
}

// Destinataires « normaux » d'un lead (client + copies), cascade : e-mails du site → du client →
// e-mail principal du client. Utilisé à la réception (ingest) et lors du renvoi après régularisation.
export function resolveLeadRecipients(opts: {
  siteNotifyEmails?: string | null
  clientNotifyEmails?: string | null
  clientEmail?: string | null
}): string[] {
  const site = parseLabeledRecipients(opts.siteNotifyEmails)
  const cli = parseLabeledRecipients(opts.clientNotifyEmails)
  const all = (r: { jboost: string[]; client: string[] }) => [...r.client, ...r.jboost]
  const recipients = all(site).length ? all(site) : all(cli).length ? all(cli) : parseRecipients(opts.clientEmail)
  return [...new Set(recipients)]
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
  // Champs supplémentaires du formulaire (destination, dates, compagnie…) : { [clé]: valeur }
  extra?: Record<string, string> | null
  // Bandeau d'avertissement optionnel (ex. « client bloqué, lead non transmis »)
  note?: string
}): Promise<boolean> {
  const t = getTransporter()
  if (!t || opts.to.length === 0) return false

  const from = process.env.MAIL_FROM || process.env.SMTP_USER
  const { lead } = opts
  const subject = `Nouveau lead — ${opts.campagneName} (${opts.siteName})`

  // Champs présents uniquement, avec valeur texte + valeur HTML (e-mail et téléphone cliquables)
  const A = '#6A4FE6'
  const telHref = lead.phone ? String(lead.phone).replace(/[^\d+]/g, '') : ''
  type Field = { label: string; text: string; html: string }
  const fields: Field[] = [
    lead.name ? { label: 'Nom', text: String(lead.name), html: escapeHtml(String(lead.name)) } : null,
    lead.email ? { label: 'Email', text: String(lead.email), html: `<a href="mailto:${escapeHtml(String(lead.email))}" style="color:${A};text-decoration:none;font-weight:600">${escapeHtml(String(lead.email))}</a>` } : null,
    lead.phone ? { label: 'Téléphone', text: String(lead.phone), html: `<a href="tel:${telHref}" style="color:${A};text-decoration:none;font-weight:600">${escapeHtml(String(lead.phone))}</a>` } : null,
    lead.message ? { label: 'Message', text: String(lead.message), html: escapeHtml(String(lead.message)).replace(/\n/g, '<br>') } : null,
    lead.source ? { label: 'Source', text: String(lead.source), html: escapeHtml(String(lead.source)) } : null,
  ].filter((f): f is Field => f !== null)

  // Champs supplémentaires du formulaire, ajoutés après les champs standard.
  if (opts.extra) {
    for (const [k, v] of Object.entries(opts.extra)) {
      const val = String(v ?? '').trim()
      if (!val) continue
      fields.push({ label: prettyFieldLabel(k), text: val, html: escapeHtml(val).replace(/\n/g, '<br>') })
    }
  }

  const text =
    (opts.note ? `${opts.note}\n\n` : '') +
    `Nouveau lead reçu via MonsieurLead\n\nClient : ${opts.clientName}\nCampagne : ${opts.campagneName}\nSite : ${opts.siteName}\n\n` +
    fields.map((f) => `${f.label} : ${f.text}`).join('\n')

  const badge = (txt: string, bg: string, color: string) =>
    `<span style="display:inline-block;background:${bg};color:${color};font-weight:600;font-size:12px;padding:3px 10px;border-radius:999px;margin:0 5px 5px 0">${escapeHtml(txt)}</span>`

  const rowsHtml = fields
    .map((f, i) => {
      const bg = i % 2 ? '#FAFAFC' : '#FFFFFF'
      return `<tr>
          <td style="padding:13px 22px;background:${bg};border-bottom:1px solid #EEF0F5;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#9296A5;width:120px;vertical-align:top">${f.label}</td>
          <td style="padding:13px 22px;background:${bg};border-bottom:1px solid #EEF0F5;font-size:15px;color:#16171D;vertical-align:top;line-height:1.5">${f.html}</td>
        </tr>`
    })
    .join('')

  const html = `
  <div style="background:#F4F5F8;padding:24px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        <tr><td style="background:#6A4FE6;border-radius:14px 14px 0 0;padding:22px 24px">
          <div style="color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:-.01em">MonsieurLead</div>
          <div style="color:#DAD3FB;font-size:13px;margin-top:2px">Nouveau lead reçu 🎉</div>
        </td></tr>
      </table>
      <div style="background:#FFFFFF;border:1px solid #E8E9EF;border-top:0;border-radius:0 0 14px 14px;overflow:hidden">
        <div style="padding:18px 22px 4px">
          ${opts.note ? `<div style="background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;padding:11px 14px;border-radius:10px;font-size:13px;line-height:1.5;margin-bottom:14px">${escapeHtml(opts.note)}</div>` : ''}
          <div>
            ${badge(opts.clientName, '#EFEBFD', '#6A4FE6')}${badge(opts.campagneName, '#F1F2F6', '#4B4F5C')}${badge(opts.siteName, '#F1F2F6', '#4B4F5C')}
          </div>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-top:1px solid #EEF0F5;margin-top:8px">
          ${rowsHtml}
        </table>
        ${lead.email ? `<div style="padding:18px 22px">
          <a href="mailto:${escapeHtml(String(lead.email))}" style="display:inline-block;background:#6A4FE6;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:11px 22px;border-radius:10px">Répondre au lead</a>
        </div>` : ''}
      </div>
      <p style="color:#9AA0AE;text-align:center;font-size:11.5px;margin:16px 0 0">Transféré automatiquement par MonsieurLead.</p>
    </div>
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
