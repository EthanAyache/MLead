'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Met en ligne la page publique d'un site depuis le back-office, sans attendre que le client le
// fasse depuis son portail. Même mécanique et mêmes règles : une page par site.

export type Choix = { id: string; name: string; slug: string }

function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function CreatePageButton({ dossierId, defaultName, themes, periods, sitesDomain }: {
  dossierId: string
  defaultName: string
  themes: Choix[]
  periods: Choix[]
  sitesDomain: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [themeId, setThemeId] = useState(themes[0]?.id ?? '')
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? '')
  const [brandName, setBrandName] = useState(defaultName)
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState('')

  const themeSlug = themes.find((t) => t.id === themeId)?.slug ?? ''
  const periodSlug = periods.find((p) => p.id === periodId)?.slug ?? ''
  const apercu = [themeSlug, slugify(brandName) || 'nom-de-loffre', periodSlug].filter(Boolean).join('-')

  const indisponible = themes.length === 0 || periods.length === 0

  async function creer() {
    setErreur('')
    setBusy(true)
    try {
      const res = await fetch('/api/generated-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId, themeId, periodId, brandName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'La création a échoué.')
      router.push(`/dossiers/${dossierId}/page-publique`)
      router.refresh()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur')
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:border-blue-400 hover:text-blue-700"
      >
        Créer la page publique
      </button>
    )
  }

  const champ = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400'

  return (
    <div className="w-full mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-gray-900">Mettre la page en ligne</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-800">
          Annuler
        </button>
      </div>

      {indisponible ? (
        <p className="mt-3 text-sm font-semibold text-amber-700">
          Ajoute d&apos;abord au moins un thème et une période dans « Sites clients ».
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Thème</span>
              <select className={`mt-1 ${champ}`} value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Nom de l&apos;offre</span>
              <input className={`mt-1 ${champ}`} value={brandName} maxLength={60}
                     onChange={(e) => setBrandName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">Période</span>
              <select className={`mt-1 ${champ}`} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Adresse : <span className="font-mono font-semibold text-gray-800">{apercu}.{sitesDomain}</span>
          </p>

          {erreur && <p className="mt-2 text-sm font-semibold text-red-700">{erreur}</p>}

          <button type="button" onClick={creer} disabled={busy || !brandName.trim()}
                  className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Création…' : 'Créer la page'}
          </button>
        </>
      )}
    </div>
  )
}
