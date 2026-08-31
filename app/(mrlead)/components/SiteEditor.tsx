'use client'

import { useEffect, useRef, useState } from 'react'

// Éditeur de la page publique d'un site généré. Utilisé tel quel par le portail client
// et par le back-office : c'est l'API (/api/generated-sites/[id]) qui décide des droits.

export type SiteEditorData = {
  brandName: string
  offerTitle: string
  startDate: string // format « AAAA-MM-JJ » (input date), vide si non renseigné
  endDate: string
  presentationHtml: string
  photos: string[]
}

// Styles du bloc « Présentation » : le back-office tourne sous Tailwind, dont le reset
// supprimerait titres et puces. On redonne ici l'aspect qu'aura le texte sur le site public.
const EDITOR_CSS = `
.presentation-editor { min-height: 220px; }
.presentation-editor h2 { font-size: 22px; font-weight: 700; margin: 0 0 8px; line-height: 1.25; }
.presentation-editor h3 { font-size: 17px; font-weight: 700; margin: 0 0 8px; color: #8A6110; }
.presentation-editor p { margin: 0 0 12px; }
.presentation-editor ul { list-style: disc; margin: 0 0 12px; padding-left: 22px; }
.presentation-editor ol { list-style: decimal; margin: 0 0 12px; padding-left: 22px; }
.presentation-editor li { margin-bottom: 4px; }
.presentation-editor blockquote { margin: 0 0 12px; padding-left: 12px; border-left: 3px solid #DCDDE6; color: #4B4F5C; }
.presentation-editor a { color: #6A4FE6; text-decoration: underline; }
.presentation-editor img { max-width: 100%; border-radius: 12px; margin: 8px 0; }
.presentation-editor:empty::before { content: attr(data-placeholder); color: #9AA0AE; }
`

// Les photos brutes d'un téléphone pèsent plusieurs Mo : on les réduit dans le navigateur
// avant l'envoi (même principe que la template d'origine).
function resizeImage(file: File, maxWidth: number, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('lecture'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('image'))
      img.onload = () => {
        const ratio = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

const BOUTONS: { cmd: string; label: string; titre: string }[] = [
  { cmd: 'bold', label: 'G', titre: 'Gras' },
  { cmd: 'italic', label: 'I', titre: 'Italique' },
  { cmd: 'underline', label: 'S', titre: 'Souligné' },
  { cmd: 'strikeThrough', label: 'B', titre: 'Barré' },
]

export default function SiteEditor({ siteId, publicUrl, initial }: {
  siteId: string
  publicUrl: string
  initial: SiteEditorData
}) {
  const [brandName, setBrandName] = useState(initial.brandName)
  const [offerTitle, setOfferTitle] = useState(initial.offerTitle)
  const [startDate, setStartDate] = useState(initial.startDate)
  const [endDate, setEndDate] = useState(initial.endDate)
  const [photos, setPhotos] = useState(initial.photos)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)

  const editeur = useRef<HTMLDivElement>(null)
  const selection = useRef<Range | null>(null)

  // Contenu injecté une seule fois : ensuite, c'est le navigateur qui possède le HTML
  // (un rendu React par frappe replacerait le curseur au début).
  useEffect(() => {
    if (editeur.current) editeur.current.innerHTML = initial.presentationHtml
  }, [initial.presentationHtml])

  function memoriser() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount && editeur.current?.contains(sel.anchorNode)) {
      selection.current = sel.getRangeAt(0)
    }
  }

  // Un clic sur la barre d'outils fait perdre la sélection : on la restaure avant la commande.
  function executer(cmd: string, valeur?: string) {
    editeur.current?.focus()
    const sel = window.getSelection()
    if (selection.current && sel) {
      sel.removeAllRanges()
      sel.addRange(selection.current)
    }
    // document.execCommand est déprécié mais reste le seul moyen simple d'éditer du texte riche
    // sans embarquer une librairie ; c'est aussi ce qu'utilisait la template d'origine.
    document.execCommand(cmd, false, valeur)
    memoriser()
  }

  async function ajouterPhotos(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setMessage(null)
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await resizeImage(file, 1600)
        const res = await fetch(`/api/generated-sites/${siteId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, target: 'gallery' }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Envoi impossible.')
        setPhotos(json.photos)
      }
      setMessage({ texte: 'Photos ajoutées.', erreur: false })
    } catch (err) {
      setMessage({ texte: err instanceof Error ? err.message : 'Envoi impossible.', erreur: true })
    } finally {
      setBusy(false)
    }
  }

  async function insererImage(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const dataUrl = await resizeImage(file, 1200)
      const res = await fetch(`/api/generated-sites/${siteId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, target: 'presentation' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Envoi impossible.')
      executer('insertImage', json.url)
    } catch (err) {
      setMessage({ texte: err instanceof Error ? err.message : 'Envoi impossible.', erreur: true })
    } finally {
      setBusy(false)
    }
  }

  // La suppression d'une photo n'est effective (et le fichier effacé) qu'à l'enregistrement.
  function retirerPhoto(url: string) {
    setPhotos((p) => p.filter((x) => x !== url))
  }

  function deplacerPhoto(index: number, sens: -1 | 1) {
    setPhotos((p) => {
      const cible = index + sens
      if (cible < 0 || cible >= p.length) return p
      const next = [...p]
      ;[next[index], next[cible]] = [next[cible], next[index]]
      return next
    })
  }

  async function enregistrer() {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/generated-sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName,
          offerTitle,
          startDate,
          endDate,
          presentationHtml: editeur.current?.innerHTML ?? '',
          photos,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "L'enregistrement a échoué.")
      setMessage({ texte: 'Page publiée. Les visiteurs voient déjà la nouvelle version.', erreur: false })
    } catch (err) {
      setMessage({ texte: err instanceof Error ? err.message : 'Erreur', erreur: true })
    } finally {
      setBusy(false)
    }
  }

  const champ = 'w-full rounded-xl border border-[#E8E9EF] bg-white px-3 py-2 text-sm outline-none focus:border-[#6A4FE6]'
  const outil = 'rounded-lg border border-[#E8E9EF] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#414350] transition hover:border-[#6A4FE6] hover:text-[#6A4FE6]'

  return (
    <div className="space-y-6">
      <style>{EDITOR_CSS}</style>

      {/* --- En-tête du site --- */}
      <section className="rounded-2xl border border-[#E8E9EF] bg-white p-5">
        <h2 className="font-bricolage text-base font-bold">En-tête</h2>
        <p className="mt-1 text-xs text-[#787C8A]">
          L&apos;adresse du site ne change pas : <span className="font-semibold text-[#414350]">{publicUrl}</span>
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">Nom affiché</span>
            <input className={`mt-1 ${champ}`} value={brandName} maxLength={60}
                   onChange={(e) => setBrandName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">Titre de l&apos;offre</span>
            <input className={`mt-1 ${champ}`} value={offerTitle} maxLength={120}
                   placeholder="Séjour famille en bord de mer"
                   onChange={(e) => setOfferTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">Du</span>
            <input type="date" className={`mt-1 ${champ}`} value={startDate}
                   onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">Au</span>
            <input type="date" className={`mt-1 ${champ}`} value={endDate}
                   onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
      </section>

      {/* --- Photos du carrousel --- */}
      <section className="rounded-2xl border border-[#E8E9EF] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bricolage text-base font-bold">Photos ({photos.length})</h2>
          <label className={`${outil} cursor-pointer`}>
            Ajouter des photos
            <input type="file" accept="image/*" multiple hidden disabled={busy}
                   onChange={(e) => { void ajouterPhotos(e.target.files); e.target.value = '' }} />
          </label>
        </div>

        {photos.length === 0 ? (
          <p className="mt-4 text-sm text-[#787C8A]">Aucune photo pour le moment.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((url, i) => (
              <li key={url} className="overflow-hidden rounded-xl border border-[#E8E9EF]">
                {/* eslint-disable-next-line @next/next/no-img-element -- fichiers servis par /api/uploads */}
                <img src={url} alt={`Photo ${i + 1}`} className="h-28 w-full object-cover" />
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <div className="flex gap-1">
                    <button type="button" className={outil} onClick={() => deplacerPhoto(i, -1)}
                            disabled={i === 0} aria-label="Déplacer vers la gauche">←</button>
                    <button type="button" className={outil} onClick={() => deplacerPhoto(i, 1)}
                            disabled={i === photos.length - 1} aria-label="Déplacer vers la droite">→</button>
                  </div>
                  <button type="button" onClick={() => retirerPhoto(url)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2]">
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-[#9AA0AE]">
          Les photos retirées sont définitivement supprimées à l&apos;enregistrement.
        </p>
      </section>

      {/* --- Présentation --- */}
      <section className="rounded-2xl border border-[#E8E9EF] bg-white p-5">
        <h2 className="font-bricolage text-base font-bold">Présentation</h2>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <select className={outil} defaultValue=""
                  onMouseDown={memoriser}
                  onChange={(e) => { if (e.target.value) executer('formatBlock', `<${e.target.value}>`); e.target.value = '' }}>
            <option value="">Style…</option>
            <option value="p">Paragraphe</option>
            <option value="h2">Titre</option>
            <option value="h3">Sous-titre</option>
            <option value="blockquote">Citation</option>
          </select>

          {BOUTONS.map((b) => (
            <button key={b.cmd} type="button" className={outil} title={b.titre}
                    onMouseDown={(e) => { e.preventDefault(); memoriser() }}
                    onClick={() => executer(b.cmd)}>{b.label}</button>
          ))}

          <button type="button" className={outil} title="Liste à puces"
                  onMouseDown={(e) => { e.preventDefault(); memoriser() }}
                  onClick={() => executer('insertUnorderedList')}>• Liste</button>
          <button type="button" className={outil} title="Liste numérotée"
                  onMouseDown={(e) => { e.preventDefault(); memoriser() }}
                  onClick={() => executer('insertOrderedList')}>1. Liste</button>
          <button type="button" className={outil} title="Insérer un lien"
                  onMouseDown={(e) => { e.preventDefault(); memoriser() }}
                  onClick={() => {
                    const url = window.prompt('Adresse du lien (https://…)')
                    if (url) executer('createLink', url)
                  }}>Lien</button>
          <label className={`${outil} cursor-pointer`} title="Insérer une image">
            Image
            <input type="file" accept="image/*" hidden disabled={busy}
                   onChange={(e) => { void insererImage(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          <button type="button" className={outil} title="Effacer la mise en forme"
                  onMouseDown={(e) => { e.preventDefault(); memoriser() }}
                  onClick={() => executer('removeFormat')}>Effacer style</button>
        </div>

        <div
          ref={editeur}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Présentation du site"
          data-placeholder="Cliquez ici pour écrire…"
          className="presentation-editor mt-3 rounded-xl border border-[#E8E9EF] bg-[#FAFAFC] p-4 text-sm outline-none focus:border-[#6A4FE6]"
          onKeyUp={memoriser}
          onMouseUp={memoriser}
          onBlur={memoriser}
          onPaste={(e) => {
            // Collage en texte brut : évite d'importer la mise en forme (et le HTML) d'un autre site.
            e.preventDefault()
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
          }}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={enregistrer} disabled={busy}
                className="rounded-xl bg-[#6A4FE6] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5840CC] disabled:opacity-60">
          {busy ? 'Enregistrement…' : 'Enregistrer et publier'}
        </button>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer"
           className="rounded-xl border border-[#E8E9EF] bg-white px-5 py-2.5 text-sm font-semibold text-[#414350] transition hover:border-[#6A4FE6] hover:text-[#6A4FE6]">
          Voir la page publique
        </a>
        {message && (
          <span className={`text-sm font-semibold ${message.erreur ? 'text-[#B91C1C]' : 'text-[#0F7B4F]'}`}>
            {message.texte}
          </span>
        )}
      </div>
    </div>
  )
}
