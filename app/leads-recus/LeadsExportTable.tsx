'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

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
  clientName: string
  campagneName: string
  siteName: string
  offers: string
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

export default function LeadsExportTable({ rows }: { rows: ExportRow[] }) {
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = q
    ? rows.filter((r) =>
        [r.name, r.email, r.phone, r.message, r.source, r.clientName, r.campagneName, r.siteName, r.offers]
          .filter(Boolean).join(' ').toLowerCase().includes(q),
      )
    : rows

  // Lignes "à plat" avec en-têtes lisibles pour l'export.
  function exportData() {
    return filtered.map((r) => ({
      'Date': fmtDate(r.receivedAt),
      'Nom': r.name ?? '',
      'Email': r.email ?? '',
      'Téléphone': r.phone ?? '',
      'Client': r.clientName,
      'Campagne': r.campagneName,
      'Site': r.siteName,
      'Statut': STATUS_LABEL[r.status],
      'Affecté JBoost': r.assignedToJboost ? 'Oui' : 'Non',
      'Offres prises': r.offers,
      'Source': r.source ?? '',
      'Message': r.message ?? '',
    }))
  }

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(exportData())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, 'leads-recus.xlsx')
  }

  function exportCsv() {
    const data = exportData()
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const esc = (v: unknown) => {
      const s = String(v ?? '')
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const csv = '﻿' + [headers.join(','), ...data.map((row) => headers.map((h) => esc((row as Record<string, unknown>)[h])).join(','))].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads-recus.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (nom, email, client, site…)" className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={exportExcel} disabled={filtered.length === 0} className="h-9 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Exporter Excel
          </button>
          <button onClick={exportCsv} disabled={filtered.length === 0} className="h-9 px-3 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
            Exporter CSV
          </button>
        </div>
      </div>

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
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition align-top">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.receivedAt)}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{r.name || '—'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
