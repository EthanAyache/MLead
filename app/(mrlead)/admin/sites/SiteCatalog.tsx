'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DEPARTMENTS } from '@/lib/departments'

// Catalogue des thèmes et périodes proposés aux clients dans « Créer mon site ».
// Le slug fixe l'adresse publique des sites : il est choisi à la création et n'est plus modifiable.

export type ThemeRow = {
  id: string; name: string; slug: string; defaultUnitPrice: number
  department: string; active: boolean; position: number; sitesCount: number
}
export type PeriodRow = { id: string; name: string; slug: string; active: boolean; position: number; sitesCount: number }

const champ = 'rounded-lg border border-[#E8E9EF] bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#6A4FE6]'
const bouton = 'rounded-lg border border-[#E8E9EF] bg-white px-3 py-1.5 text-xs font-semibold text-[#414350] transition hover:border-[#6A4FE6] hover:text-[#6A4FE6]'

export default function SiteCatalog({ themes, periods }: { themes: ThemeRow[]; periods: PeriodRow[] }) {
  const router = useRouter()
  const [erreur, setErreur] = useState('')
  const [busy, setBusy] = useState(false)

  const [themeName, setThemeName] = useState('')
  const [themePrice, setThemePrice] = useState('0')
  const [themeDept, setThemeDept] = useState('AUTRE')
  const [periodName, setPeriodName] = useState('')

  async function appel(url: string, method: string, body?: unknown) {
    setBusy(true)
    setErreur('')
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Action impossible.')
      router.refresh()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {erreur && (
        <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm font-semibold text-[#B91C1C]">{erreur}</p>
      )}

      {/* ---- Thèmes ---- */}
      <section className="rounded-2xl border border-[#E8E9EF] bg-white p-5">
        <h2 className="font-bricolage text-lg font-bold">Thèmes</h2>
        <p className="mt-1 text-sm text-[#787C8A]">
          Un site créé par un client reprend le prix par lead déjà convenu avec lui (celui de sa campagne).
          Le prix ci-dessous ne sert que de repli, pour un client qui n&apos;a encore aucun site.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#9AA0AE]">
                <th className="py-2">Nom</th>
                <th className="py-2">Adresse</th>
                <th className="py-2">€ HT / lead (repli)</th>
                <th className="py-2">Département</th>
                <th className="py-2">Sites</th>
                <th className="py-2">Proposé</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F5]">
              {themes.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-3">
                    <input className={champ} defaultValue={t.name} disabled={busy}
                           onBlur={(e) => e.target.value !== t.name && appel('/api/site-themes', 'PATCH', { id: t.id, name: e.target.value })} />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-[#787C8A]">{t.slug}</td>
                  <td className="py-2 pr-3">
                    <input className={`${champ} w-24`} type="number" step="0.01" min="0" defaultValue={t.defaultUnitPrice} disabled={busy}
                           onBlur={(e) => Number(e.target.value) !== t.defaultUnitPrice && appel('/api/site-themes', 'PATCH', { id: t.id, defaultUnitPrice: e.target.value })} />
                  </td>
                  <td className="py-2 pr-3">
                    <select className={champ} defaultValue={t.department} disabled={busy}
                            onChange={(e) => appel('/api/site-themes', 'PATCH', { id: t.id, department: e.target.value })}>
                      {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-3 text-[#787C8A]">{t.sitesCount}</td>
                  <td className="py-2 pr-3">
                    <input type="checkbox" defaultChecked={t.active} disabled={busy}
                           onChange={(e) => appel('/api/site-themes', 'PATCH', { id: t.id, active: e.target.checked })} />
                  </td>
                  <td className="py-2 text-right">
                    {t.sitesCount === 0 && (
                      <button type="button" className={bouton} disabled={busy}
                              onClick={() => confirm(`Supprimer le thème « ${t.name} » ?`) && appel(`/api/site-themes?id=${t.id}`, 'DELETE')}>
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#EEF0F5] pt-4">
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">Nouveau thème</span>
            <input className={`mt-1 block ${champ}`} value={themeName} placeholder="Voyage cacher"
                   onChange={(e) => setThemeName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">€ HT / lead (repli)</span>
            <input className={`mt-1 block w-24 ${champ}`} type="number" step="0.01" min="0" value={themePrice}
                   onChange={(e) => setThemePrice(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">Département</span>
            <select className={`mt-1 block ${champ}`} value={themeDept} onChange={(e) => setThemeDept(e.target.value)}>
              {DEPARTMENTS.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy || !themeName.trim()}
                  className="rounded-lg bg-[#6A4FE6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5840CC] disabled:opacity-60"
                  onClick={async () => {
                    await appel('/api/site-themes', 'POST', { name: themeName, defaultUnitPrice: themePrice, department: themeDept })
                    setThemeName(''); setThemePrice('0')
                  }}>
            Ajouter
          </button>
        </div>
      </section>

      {/* ---- Périodes ---- */}
      <section className="rounded-2xl border border-[#E8E9EF] bg-white p-5">
        <h2 className="font-bricolage text-lg font-bold">Périodes</h2>
        <p className="mt-1 text-sm text-[#787C8A]">Dernier morceau de l&apos;adresse du site (ex. Souccot).</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#9AA0AE]">
                <th className="py-2">Nom</th>
                <th className="py-2">Adresse</th>
                <th className="py-2">Ordre</th>
                <th className="py-2">Sites</th>
                <th className="py-2">Proposée</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF0F5]">
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 pr-3">
                    <input className={champ} defaultValue={p.name} disabled={busy}
                           onBlur={(e) => e.target.value !== p.name && appel('/api/site-periods', 'PATCH', { id: p.id, name: e.target.value })} />
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-[#787C8A]">{p.slug}</td>
                  <td className="py-2 pr-3">
                    <input className={`${champ} w-16`} type="number" defaultValue={p.position} disabled={busy}
                           onBlur={(e) => Number(e.target.value) !== p.position && appel('/api/site-periods', 'PATCH', { id: p.id, position: e.target.value })} />
                  </td>
                  <td className="py-2 pr-3 text-[#787C8A]">{p.sitesCount}</td>
                  <td className="py-2 pr-3">
                    <input type="checkbox" defaultChecked={p.active} disabled={busy}
                           onChange={(e) => appel('/api/site-periods', 'PATCH', { id: p.id, active: e.target.checked })} />
                  </td>
                  <td className="py-2 text-right">
                    {p.sitesCount === 0 && (
                      <button type="button" className={bouton} disabled={busy}
                              onClick={() => confirm(`Supprimer la période « ${p.name} » ?`) && appel(`/api/site-periods?id=${p.id}`, 'DELETE')}>
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[#EEF0F5] pt-4">
          <label className="block">
            <span className="text-xs font-semibold text-[#787C8A]">Nouvelle période</span>
            <input className={`mt-1 block ${champ}`} value={periodName} placeholder="Souccot"
                   onChange={(e) => setPeriodName(e.target.value)} />
          </label>
          <button type="button" disabled={busy || !periodName.trim()}
                  className="rounded-lg bg-[#6A4FE6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5840CC] disabled:opacity-60"
                  onClick={async () => {
                    await appel('/api/site-periods', 'POST', { name: periodName })
                    setPeriodName('')
                  }}>
            Ajouter
          </button>
        </div>
      </section>
    </div>
  )
}
