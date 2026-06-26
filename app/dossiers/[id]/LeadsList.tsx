'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  status: 'VALID' | 'DUPLICATE' | 'REJECTED'
  receivedAt: string
  billed: boolean
}

const STATUS_BADGE: Record<LeadRow['status'], { label: string; cls: string }> = {
  VALID: { label: 'Valide', cls: 'bg-green-50 text-green-700 border-green-200' },
  DUPLICATE: { label: 'Doublon', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  REJECTED: { label: 'Rejeté', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
}

export default function LeadsList({ rows }: { rows: LeadRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const q = search.trim().toLowerCase()
  const filtered = q
    ? rows.filter((r) =>
        [r.name, r.email, r.phone, r.message, r.source].filter(Boolean).join(' ').toLowerCase().includes(q),
      )
    : rows

  async function setStatus(id: string, status: LeadRow['status']) {
    setBusyId(id)
    await fetch(`/api/inbound-leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusyId(null)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-gray-100">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un lead (nom, email, téléphone…)"
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          Aucun lead reçu pour l&apos;instant. Dès qu&apos;un site enverra un lead sur le lien API, il apparaîtra ici.
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-gray-500">Aucun lead ne correspond à « {search} ».</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Source</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const badge = STATUS_BADGE[r.status]
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition align-top">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(r.receivedAt).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{r.name || '—'}</td>
                  <td className="px-4 py-3">
                    {r.email
                      ? <a href={`mailto:${r.email}`} className="text-blue-600 hover:underline">{r.email}</a>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.phone
                      ? <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="text-blue-600 hover:underline whitespace-nowrap">{r.phone}</a>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate" title={r.source ?? ''}>{r.source || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.cls}`}>{badge.label}</span>
                    {r.billed && <span className="ml-1 text-[10px] text-gray-400">facturé</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {r.billed ? (
                      <span className="text-xs text-gray-400">verrouillé</span>
                    ) : r.status === 'REJECTED' ? (
                      <button onClick={() => setStatus(r.id, 'VALID')} disabled={busyId === r.id} className="text-xs font-semibold text-green-600 hover:text-green-700 disabled:opacity-50">Réactiver</button>
                    ) : (
                      <button onClick={() => setStatus(r.id, 'REJECTED')} disabled={busyId === r.id} className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">Invalider</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
