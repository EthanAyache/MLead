'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export type SiteRow = { id: string; name: string; campagneName: string; unitPrice: number; billingMode: 'MONTHLY' | 'PREPAID'; leadsCount: number }

export default function SitesManager({
  active, archived, locked, stopPayUrl,
}: {
  active: SiteRow[]
  archived: SiteRow[]
  locked: boolean
  stopPayUrl: string | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmAll, setConfirmAll] = useState(false)
  const [reason, setReason] = useState('')

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function stopSites(ids: string[], global: boolean, why?: string) {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/portal/stop-sites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierIds: ids, global, reason: why }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Une erreur est survenue.'); setBusy(false); return }
      if (data.payUrl) { window.location.href = data.payUrl; return }
      router.refresh()
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  async function stopSelected() {
    if (selected.size === 0) return
    if (!confirm(`Arrêter ${selected.size} site(s) ? Vous ne recevrez plus de leads dessus. Une facture des leads déjà reçus (non réglés) vous sera présentée.`)) return
    await stopSites([...selected], false)
  }

  async function changeMode(id: string, mode: 'MONTHLY' | 'PREPAID') {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/portal/site-mode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId: id, mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Une erreur est survenue.'); setBusy(false); return }
      router.refresh()
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  async function reactivate(id: string) {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/portal/reactivate-site', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Une erreur est survenue.'); setBusy(false); return }
      router.refresh()
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6">
      <h2 className="font-bricolage text-lg font-bold">Vos sites</h2>

      {locked && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
          <p className="text-sm font-semibold text-[#B91C1C]">Facture d&apos;arrêt en attente — réglez-la pour réactiver un site, acheter des leads ou changer de formule.</p>
          {stopPayUrl && (
            <a href={stopPayUrl} className="shrink-0 rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#047857]">Payer ma facture</a>
          )}
        </div>
      )}

      {/* Sites actifs */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
        {active.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[#787C8A]">Aucun site actif.</div>
        ) : (
          <ul className="divide-y divide-[#EEF0F5]">
            {active.map((s) => (
              <li key={s.id} className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    disabled={locked || busy}
                    aria-label={`Sélectionner ${s.name}`}
                    className="h-4 w-4 shrink-0 rounded border-[#DCDDE6] text-[#6A4FE6] focus:ring-[#6A4FE6] disabled:opacity-40"
                  />
                  <Link href={`/portail/site/${s.id}`} className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#16171D] hover:text-[#6A4FE6]">{s.name}</div>
                    <div className="truncate text-xs text-[#9AA0AE]">{s.campagneName} · {s.unitPrice.toFixed(2)} € HT / lead</div>
                  </Link>
                  <span className="shrink-0 text-sm"><span className="font-bold text-[#16171D]">{s.leadsCount}</span> <span className="text-[#9AA0AE]">leads</span></span>
                </div>
                {/* Formule du site */}
                <div className="mt-2 flex items-center gap-2 pl-7">
                  <span className="text-xs text-[#787C8A]">Formule :</span>
                  <div className="inline-flex gap-0.5 rounded-lg bg-[#F1F2F6] p-0.5">
                    <button onClick={() => changeMode(s.id, 'MONTHLY')} disabled={locked || busy || s.billingMode === 'MONTHLY'} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:cursor-default ${s.billingMode === 'MONTHLY' ? 'bg-white text-[#16171D] shadow-[0_1px_2px_rgba(20,22,30,.08)]' : 'text-[#787C8A] hover:text-[#16171D]'}`}>Mensuel</button>
                    <button onClick={() => changeMode(s.id, 'PREPAID')} disabled={locked || busy || s.billingMode === 'PREPAID'} className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:cursor-default ${s.billingMode === 'PREPAID' ? 'bg-white text-[#6A4FE6] shadow-[0_1px_2px_rgba(20,22,30,.08)]' : 'text-[#787C8A] hover:text-[#16171D]'}`}>Prépayé</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={stopSelected} disabled={locked || busy || selected.size === 0} className="rounded-xl border border-[#F5C5C5] bg-white px-4 py-2 text-sm font-semibold text-[#D23B3B] transition hover:bg-[#FCEAEA] disabled:opacity-40">
            Stopper les sites sélectionnés{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          <button onClick={() => { setConfirmAll(true); setReason('') }} disabled={locked || busy} className="text-sm font-semibold text-[#D23B3B] hover:underline disabled:opacity-40">
            Arrêter tous les sites
          </button>
        </div>
      )}

      {/* Sites archivés */}
      {archived.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-[#787C8A]">Sites archivés</h3>
          <div className="mt-2 overflow-hidden rounded-2xl border border-[#E8E9EF] bg-white">
            <ul className="divide-y divide-[#EEF0F5]">
              {archived.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[#787C8A]">{s.name}</div>
                    <div className="truncate text-xs text-[#9AA0AE]">{s.campagneName} · {s.leadsCount} lead{s.leadsCount > 1 ? 's' : ''} reçu{s.leadsCount > 1 ? 's' : ''}</div>
                  </div>
                  <Link href={`/portail/site/${s.id}`} className="shrink-0 text-sm font-semibold text-[#6A4FE6] hover:underline">Consulter</Link>
                  <button onClick={() => reactivate(s.id)} disabled={locked || busy} className="shrink-0 rounded-lg border border-[#DCDDE6] px-3 py-1.5 text-sm font-semibold text-[#414350] transition hover:bg-[#FAFAFC] disabled:opacity-40">
                    Réactiver
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[#D23B3B]" role="alert">⚠ {error}</p>}

      {/* Modale « arrêter tous les sites » */}
      {confirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConfirmAll(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bricolage text-lg font-bold">Arrêter tous vos sites ?</h3>
            <p className="mt-1.5 text-sm text-[#787C8A]">Vous ne recevrez plus aucun lead. Une facture des leads déjà reçus (non réglés) vous sera présentée. Pouvez-vous nous dire pourquoi ?</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Votre raison (ex. trop cher, changement de prestataire, pause…)" className="mt-3 w-full rounded-xl border border-[#DCDDE6] bg-white px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[#6A4FE6]" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmAll(false)} className="rounded-xl border border-[#DCDDE6] px-4 py-2 text-sm font-semibold text-[#414350] hover:bg-[#FAFAFC]">Annuler</button>
              <button onClick={() => { setConfirmAll(false); stopSites(active.map((s) => s.id), true, reason.trim() || undefined) }} disabled={busy} className="rounded-xl bg-[#D23B3B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#B91C1C] disabled:opacity-50">
                Arrêter tous les sites
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
