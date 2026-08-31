'use client'

import { useState } from 'react'

// Formulaire de rappel de la page publique. Reprend exactement la template
// (formulaireType/common.js) et l'envoie à l'API de réception de Mr.Lead.

const AGES = ['2 ans', '3 ans', '4 ans', '5 ans', '6 ans', '7 ans', '8 ans', '9 ans', '10 ans',
  '11 ans', '12 ans', '13 ans', '14 ans', '15 ans', '16 ans', '17 ans']

const REGLES = {
  nom: {
    test: (v: string) => v.trim().length >= 2,
    message: 'Indiquez votre nom (2 caractères minimum).',
  },
  tel: {
    test: (v: string) => /^[+0-9][0-9\s.\-()]{7,17}$/.test(v.trim()),
    message: 'Numéro invalide. Exemple : 06 12 34 56 78.',
  },
  email: {
    test: (v: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()),
    message: 'Adresse e-mail invalide. Exemple : vous@exemple.com.',
  },
} as const

type ChampId = keyof typeof REGLES

function Stepper({ id, value, min, max, onChange, label }: {
  id: string; value: number; min: number; max: number
  onChange: (n: number) => void; label: string
}) {
  return (
    <div className="stepper">
      <button type="button" className="stepper__btn" disabled={value - 1 < min}
              onClick={() => onChange(value - 1)} aria-label={`Retirer ${label}`}>
        <svg className="ic ic--sm" aria-hidden="true"><use href="#i-minus" /></svg>
      </button>
      <input className="stepper__val" type="number" id={id} name={id} value={value}
             min={min} max={max} step={1} inputMode="numeric"
             onChange={(e) => {
               const n = parseInt(e.target.value, 10)
               onChange(Number.isNaN(n) ? min : Math.max(min, Math.min(max, n)))
             }} />
      <button type="button" className="stepper__btn" disabled={value + 1 > max}
              onClick={() => onChange(value + 1)} aria-label={`Ajouter ${label}`}>
        <svg className="ic ic--sm" aria-hidden="true"><use href="#i-plus" /></svg>
      </button>
    </div>
  )
}

export default function SiteForm({ token }: { token: string }) {
  const [nom, setNom] = useState('')
  const [tel, setTel] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [adultes, setAdultes] = useState(1)
  const [enfants, setEnfants] = useState(0)
  const [bebes, setBebes] = useState(0)
  // Les âges déjà choisis sont mémorisés à part : ils survivent à un passage par 0 enfant.
  const [ages, setAges] = useState<string[]>([])
  const [parMail, setParMail] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)
  const [piege, setPiege] = useState('') // honeypot anti-robot, invisible et laissé vide par un humain

  const [erreurs, setErreurs] = useState<Partial<Record<ChampId, string>>>({})
  const [envoi, setEnvoi] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [echec, setEchec] = useState('')

  const valeurs: Record<ChampId, string> = { nom, tel, email }

  function valider(id: ChampId, valeur = valeurs[id]) {
    const ok = REGLES[id].test(valeur)
    setErreurs((e) => ({ ...e, [id]: ok ? undefined : REGLES[id].message }))
    return ok
  }

  function ageEnfant(i: number) {
    return ages[i] ?? AGES[0]
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setEchec('')

    const invalides = (Object.keys(REGLES) as ChampId[]).filter((id) => !valider(id))
    if (invalides.length) {
      document.getElementById(invalides[0])?.focus()
      return
    }

    setEnvoi(true)
    try {
      const res = await fetch(`/api/ingest?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim(),
          email: email.trim(),
          telephone: tel.trim(),
          message: message.trim(),
          source: window.location.hostname,
          website: piege,
          // Champs propres à ce formulaire : Mr.Lead les enregistre tels quels et les affiche
          // dans la fiche du lead et dans l'e-mail envoyé au client.
          Adultes: String(adultes),
          Enfants: String(enfants),
          'Bébés': String(bebes),
          'Âges des enfants': Array.from({ length: enfants }, (_, i) => ageEnfant(i)).join(', '),
          'Rappel par mail': parMail ? 'oui' : 'non',
          'Rappel WhatsApp': whatsapp ? 'oui' : 'non',
        }),
      })
      if (!res.ok) throw new Error('envoi refusé')
      setEnvoye(true)
    } catch {
      setEchec("L'envoi a échoué. Vérifiez votre connexion et réessayez.")
    } finally {
      setEnvoi(false)
    }
  }

  function recommencer() {
    setNom(''); setTel(''); setEmail(''); setMessage('')
    setAdultes(1); setEnfants(0); setBebes(0); setAges([])
    setParMail(true); setWhatsapp(true)
    setErreurs({}); setEnvoye(false); setEchec('')
  }

  if (envoye) {
    return (
      <div className="success">
        <span className="success__badge" aria-hidden="true"><svg className="ic"><use href="#i-check" /></svg></span>
        <h3 className="success__title" tabIndex={-1}>Demande envoyée</h3>
        <p className="success__txt">Merci&nbsp;! Un conseiller vous rappelle sous 24&nbsp;h ouvrées.</p>
        <button type="button" className="btn btn--ghost" onClick={recommencer}>Envoyer une autre demande</button>
      </div>
    )
  }

  const champ = (id: ChampId, props: React.InputHTMLAttributes<HTMLInputElement>, icone: string, label: React.ReactNode, aide?: string) => (
    <div className="field">
      <label htmlFor={id}>{label} <abbr className="req" title="obligatoire">*</abbr></label>
      <div className="control control--icon">
        <svg className="ic control__ic" aria-hidden="true"><use href={`#${icone}`} /></svg>
        <input
          id={id}
          name={id}
          required
          aria-invalid={erreurs[id] ? 'true' : undefined}
          aria-describedby={`err-${id}${aide ? ` hint-${id}` : ''}`}
          className={erreurs[id] ? 'is-error' : undefined}
          onBlur={() => valider(id)}
          {...props}
        />
      </div>
      {aide && <p className="hint" id={`hint-${id}`}>{aide}</p>}
      <p className={`err${erreurs[id] ? ' is-visible' : ''}`} id={`err-${id}`} role="alert">
        {erreurs[id] && (
          <>
            <svg className="ic ic--sm" aria-hidden="true"><use href="#i-alert" /></svg>
            {erreurs[id]}
          </>
        )}
      </p>
    </div>
  )

  return (
    <form onSubmit={envoyer} noValidate>
      <div className="grid-2">
        {champ('nom', {
          type: 'text', value: nom, placeholder: 'Votre nom', autoComplete: 'name',
          onChange: (e) => { setNom(e.target.value); if (erreurs.nom) valider('nom', e.target.value) },
        }, 'i-user', 'Nom')}

        {champ('tel', {
          type: 'tel', value: tel, placeholder: '06 12 34 56 78', inputMode: 'tel', autoComplete: 'tel',
          onChange: (e) => { setTel(e.target.value); if (erreurs.tel) valider('tel', e.target.value) },
        }, 'i-phone', 'Téléphone')}
      </div>

      {champ('email', {
        type: 'email', value: email, placeholder: 'vous@exemple.com', inputMode: 'email', autoComplete: 'email',
        onChange: (e) => { setEmail(e.target.value); if (erreurs.email) valider('email', e.target.value) },
      }, 'i-mail', 'E-mail', 'Nous y enverrons le programme détaillé.')}

      <fieldset className="compteurs">
        <legend className="compteurs__legend">Nombre de voyageurs</legend>
        <div className="compteurs__grille">
          <div className="compte">
            <label className="compte__txt" htmlFor="adultes"><strong>Adultes</strong><small>18 ans et plus</small></label>
            <Stepper id="adultes" value={adultes} min={1} max={12} onChange={setAdultes} label="un adulte" />
          </div>
          <div className="compte">
            <label className="compte__txt" htmlFor="enfants"><strong>Enfants</strong><small>De 2 à 17 ans</small></label>
            <Stepper id="enfants" value={enfants} min={0} max={10} onChange={setEnfants} label="un enfant" />
          </div>
          <div className="compte">
            <label className="compte__txt" htmlFor="bebes"><strong>Bébés</strong><small>Moins de 2 ans</small></label>
            <Stepper id="bebes" value={bebes} min={0} max={6} onChange={setBebes} label="un bébé" />
          </div>
        </div>
      </fieldset>

      {enfants > 0 && (
        <fieldset className="ages">
          <legend className="ages__legend">Âge des enfants au départ</legend>
          <div className="grid-2">
            {Array.from({ length: enfants }, (_, i) => (
              <div className="field" key={i}>
                <label htmlFor={`enfant${i + 1}`}>Enfant {i + 1}</label>
                <div className="control">
                  <select id={`enfant${i + 1}`} name={`enfant${i + 1}`} value={ageEnfant(i)}
                          onChange={(e) => setAges((prev) => {
                            const next = [...prev]
                            next[i] = e.target.value
                            return next
                          })}>
                    {AGES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div className="field">
        <label htmlFor="message">Votre message <span className="opt">(facultatif)</span></label>
        <div className="control">
          <textarea id="message" name="message" rows={4} value={message}
                    placeholder="Une question, une demande particulière…"
                    onChange={(e) => setMessage(e.target.value)} />
        </div>
        <p className="hint">Vous serez recontacté par téléphone ou par e-mail.</p>
      </div>

      <div className="consents">
        <label className="switch">
          <input type="checkbox" checked={parMail} onChange={(e) => setParMail(e.target.checked)} />
          <span className="switch__box" aria-hidden="true"><svg className="ic ic--xs"><use href="#i-check" /></svg></span>
          <span className="switch__txt">
            <strong>Être recontacté par mail</strong>
            <small>Réponse écrite à l&apos;adresse renseignée ci-dessus.</small>
          </span>
        </label>

        <label className="switch">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
          <span className="switch__box" aria-hidden="true"><svg className="ic ic--xs"><use href="#i-check" /></svg></span>
          <span className="switch__txt">
            <strong>Être recontacté par WhatsApp</strong>
            <small>Réponse plus rapide, sur le numéro renseigné ci-dessus.</small>
          </span>
        </label>
      </div>

      {/* Piège à robots : caché aux humains, rempli par les robots → le lead est ignoré côté API. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
             value={piege} onChange={(e) => setPiege(e.target.value)}
             style={{ position: 'absolute', left: '-9999px' }} />

      <button type="submit" className="btn btn--primary btn--block" aria-busy={envoi} disabled={envoi}>
        <span className="btn__spinner" aria-hidden="true"></span>
        <svg className="ic btn__ic" aria-hidden="true"><use href="#i-send" /></svg>
        <span className="btn__label">{envoi ? 'Envoi en cours…' : 'Envoyer ma demande'}</span>
      </button>

      {echec && (
        <p className="err is-visible" role="alert">
          <svg className="ic ic--sm" aria-hidden="true"><use href="#i-alert" /></svg>
          {echec}
        </p>
      )}

      <p className="legal">Vos données servent uniquement à traiter votre demande. Aucune revente à des tiers.</p>
    </form>
  )
}
