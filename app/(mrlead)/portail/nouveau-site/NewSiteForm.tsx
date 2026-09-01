'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

// Formulaire « Créer ma page ». La page habille un site existant (créé par l'équipe, avec son
// prix par lead). L'adresse se compose sous les yeux du client : thème + nom de l'offre + période.

export type Option = { id: string; name: string; slug?: string }
export type SiteOption = { id: string; name: string; detail: string }

function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function NewSiteForm({ sites, themes, periods, sitesDomain }: {
  sites: SiteOption[]
  themes: Option[]
  periods: Option[]
  sitesDomain: string
}) {
  const router = useRouter()
  const [dossierId, setDossierId] = useState(sites[0]?.id ?? '')
  const [themeId, setThemeId] = useState(themes[0]?.id ?? '')
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? '')
  const [brandName, setBrandName] = useState('')
  const [busy, setBusy] = useState(false)
  const [erreur, setErreur] = useState('')

  const themeSlug = themes.find((t) => t.id === themeId)?.slug ?? ''
  const periodSlug = periods.find((p) => p.id === periodId)?.slug ?? ''
  const apercu = [themeSlug, slugify(brandName) || 'nom-de-loffre', periodSlug].filter(Boolean).join('-')

  async function creer(e: React.FormEvent) {
    e.preventDefault()
    setErreur('')
    setBusy(true)
    try {
      const res = await fetch('/api/portal/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId, themeId, periodId, brandName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'La création a échoué.')
      // La page est en ligne : on emmène le client droit sur son éditeur.
      router.push(`/portail/site/${json.dossierId}/page-publique`)
      router.refresh()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur')
      setBusy(false)
    }
  }

  const champ = 'w-full rounded-xl border border-[#E8E9EF] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6A4FE6]'

  return (
    <form onSubmit={creer} className="mt-6 space-y-5 rounded-2xl border border-[#E8E9EF] bg-white p-5">
      <label className="block">
        <span className="text-xs font-semibold text-[#787C8A]">Site concerné</span>
        <select className={`mt-1 ${champ}`} value={dossierId} onChange={(e) => setDossierId(e.target.value)}>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="mt-1 block text-xs text-[#9AA0AE]">
          {sites.find((s) => s.id === dossierId)?.detail ?? 'Une page par site.'}
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-[#787C8A]">Thème</span>
        <select className={`mt-1 ${champ}`} value={themeId} onChange={(e) => setThemeId(e.target.value)}>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-[#787C8A]">Nom de l&apos;offre</span>
        <input className={`mt-1 ${champ}`} value={brandName} maxLength={60} required
               placeholder="Loisirel" onChange={(e) => setBrandName(e.target.value)} />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-[#787C8A]">Période</span>
        <select className={`mt-1 ${champ}`} value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      <div className="rounded-xl bg-[#F7F8FB] px-4 py-3">
        <p className="text-xs font-semibold text-[#787C8A]">Adresse de votre site</p>
        <p className="mt-0.5 break-all font-mono text-sm font-semibold text-[#16171D]">
          {apercu}.{sitesDomain}
        </p>
      </div>

      {erreur && <p className="text-sm font-semibold text-[#B91C1C]">{erreur}</p>}

      <button type="submit" disabled={busy || !dossierId || !brandName.trim()}
              className="w-full rounded-xl bg-[#6A4FE6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5840CC] disabled:opacity-60">
        {busy ? 'Création…' : 'Créer ma page'}
      </button>
      <p className="text-center text-xs text-[#9AA0AE]">
        Mise en ligne immédiate et gratuite. Vous ne payez que les leads reçus.
      </p>
    </form>
  )
}
