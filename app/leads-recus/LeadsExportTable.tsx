'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LeadsExportButtons from '@/app/components/LeadsExportButtons'
import LeadNote from '@/app/components/LeadNote'

export type ExportRow = {
  id: string
  receivedAt: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  status: 'VALID' | 'DUPLICATE' | 'REJECTED'
  assignedToJboost: boolean
  billed: boolean
  clientName: string
  campagneName: string
  siteName: string
  offers: string
  extra?: Record<string, string> | null
  note?: string | null
}

const STATUS_LABEL: Record<ExportRow['status'], string> = {
  VALID: 'Valide',
  DUPLICATE: 'Doublon',
  REJECTED: 'Rejeté',
}
const STATUS_CLS: Record<ExportRow['status'], string> = {
  VALID: 'bg-green-50 text-green-700 border-green-200',
  DUPLICATE: 'bg-amber-50 text-amber-700 border-amber-200',
  REJECTED: 'bg-gray-100 text-gray-500 border-gray-200',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR')
}

// Date locale "AAAA-MM-JJ" pour comparer avec les <input type="date">
function localYMD(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function LeadsExportTable({
  rows,
  isAdmin,
  exportTitle = 'Tous les leads reçus',
  exportFileBase = 'tous-les-leads',
}: {
  rows: ExportRow[]
  isAdmin: boolean
  exportTitle?: string
  exportFileBase?: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Suppression d'un lead, avec confirmation. `force` = admin qui supprime un lead déjà facturé.
  async function remove(r: ExportRow, force = false) {
    const msg = force
      ? `⚠️ Ce lead est DÉJÀ FACTURÉ.\n\nForcer sa suppression ? La facture déjà émise ne sera pas modifiée. Action irréversible.`
      : `Supprimer définitivement ce lead${r.name ? ` « ${r.name} »` : ''} ?\n\nCette action est irréversible.`
    if (!confirm(msg)) return
    setBusyId(r.id)
    setError('')
    try {
      const res = await fetch(`/api/inbound-leads/${r.id}${force ? '?force=1' : ''}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Suppression impossible.')
      } else {
        router.refresh()
      }
    } catch {
      setError('Erreur réseau lors de la suppression.')
    } finally {
      setBusyId(null)
    }
  }

  const q = search.trim().toLowerCase()
  const filtered = rows.filter((r) => {
    const ymd = localYMD(r.receivedAt)
    if (dateFrom && ymd < dateFrom) return false
    if (dateTo && ymd > dateTo) return false
    if (q && ![r.name, r.email, r.phone, r.message, r.source, r.clientName, r.campagneName, r.siteName, r.offers].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, email, client, site…)" className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
          <span>Du</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 px-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span>au</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 px-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {(dateFrom || dateTo) && <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }} className="h-7 w-7 rounded-md hover:bg-gray-100 text-gray-400" title="Effacer les dates">✕</button>}
        </div>
        <div className="ml-auto">
          <LeadsExportButtons rows={filtered} title={exportTitle} fileBase={exportFileBase} />
        </div>
      </div>

      {error && <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-700 text-sm">⚠ {error}</div>}

      {rows.length === 0 ? (
        <div className="p-12 text-center text-gray-500">Aucun lead reçu pour l&apos;instant.</div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-gray-500">Aucun lead ne correspond à « {search} ».</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Client</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Campagne / Site</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Offres</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition align-top">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.receivedAt)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {r.name || '—'}
                    <div className="max-w-[220px] font-normal"><LeadNote leadId={r.id} initialNote={r.note ?? null} variant="admin" /></div>
                  </td>
                  <td className="px-4 py-3">
                    {r.email ? <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.phone ? <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:underline whitespace-nowrap">{r.phone}</a> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.clientName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{r.campagneName} · {r.siteName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_CLS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    {r.assignedToJboost && <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">JBOOST</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={r.offers}>{r.offers || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!r.billed ? (
                      <button onClick={() => remove(r)} disabled={busyId === r.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-50">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        {busyId === r.id ? '…' : 'Supprimer'}
                      </button>
                    ) : isAdmin ? (
                      <button onClick={() => remove(r, true)} disabled={busyId === r.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50" title="Lead déjà facturé — forcer la suppression (admin)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                        {busyId === r.id ? '…' : 'Forcer'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400" title="Lead déjà facturé — suppression impossible">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        verrouillé
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
