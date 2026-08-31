'use client'

import * as XLSX from 'xlsx'
import { prettyFieldLabel } from '@/lib/leadExtra'

// Ligne de lead prête à exporter (Excel / CSV / PDF). Chaque page mappe ses leads vers ce format.
export type LeadExportRow = {
  receivedAt: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  source: string | null
  status: string
  assignedToJboost: boolean
  clientName: string
  campagneName: string
  siteName: string
  offers: string
  // Champs supplémentaires du formulaire (destination, dates…) : une colonne par champ à l'export.
  extra?: Record<string, string> | null
}

const STATUS_LABEL: Record<string, string> = { VALID: 'Valide', DUPLICATE: 'Doublon', REJECTED: 'Rejeté' }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR')
}

// Lignes "à plat" avec en-têtes lisibles (Excel / CSV). Les champs supplémentaires deviennent
// des colonnes dédiées (une par champ rencontré, dans l'ordre de première apparition).
function toFlat(rows: LeadExportRow[]) {
  const extraKeys: string[] = []
  for (const r of rows) {
    if (r.extra) for (const k of Object.keys(r.extra)) if (!extraKeys.includes(k)) extraKeys.push(k)
  }
  return rows.map((r) => {
    const base: Record<string, string> = {
      Date: fmtDate(r.receivedAt),
      Nom: r.name ?? '',
      Email: r.email ?? '',
      'Téléphone': r.phone ?? '',
      Client: r.clientName,
      Campagne: r.campagneName,
      Site: r.siteName,
      Statut: STATUS_LABEL[r.status] ?? r.status,
      'Affecté JBoost': r.assignedToJboost ? 'Oui' : 'Non',
      'Offres prises': r.offers,
      Source: r.source ?? '',
      Message: r.message ?? '',
    }
    for (const k of extraKeys) base[prettyFieldLabel(k)] = r.extra?.[k] ?? ''
    return base
  })
}

export default function LeadsExportButtons({ rows, title, fileBase }: { rows: LeadExportRow[]; title: string; fileBase: string }) {
  const disabled = rows.length === 0

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(toFlat(rows))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, `${fileBase}.xlsx`)
  }

  function exportCsv() {
    const data = toFlat(rows)
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
    a.download = `${fileBase}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // PDF : jsPDF chargé à la demande (import dynamique) pour ne pas alourdir le bundle.
  async function exportPdf() {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text(title, 14, 15)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`${rows.length} lead${rows.length > 1 ? 's' : ''} — exporté le ${new Date().toLocaleDateString('fr-FR')}`, 14, 21)
    autoTable(doc, {
      startY: 26,
      head: [['Date', 'Nom', 'Email', 'Téléphone', 'Client', 'Campagne / Site', 'Statut', 'Offres']],
      body: rows.map((r) => [
        fmtDate(r.receivedAt),
        r.name ?? '',
        r.email ?? '',
        r.phone ?? '',
        r.clientName,
        `${r.campagneName} · ${r.siteName}`,
        STATUS_LABEL[r.status] ?? r.status,
        r.offers,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [106, 79, 230] },
      alternateRowStyles: { fillColor: [247, 247, 250] },
    })
    doc.save(`${fileBase}.pdf`)
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={exportExcel} disabled={disabled} className="h-9 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        Excel
      </button>
      <button onClick={exportCsv} disabled={disabled} className="h-9 px-3 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
        CSV
      </button>
      <button onClick={exportPdf} disabled={disabled} className="h-9 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
        PDF
      </button>
    </div>
  )
}
