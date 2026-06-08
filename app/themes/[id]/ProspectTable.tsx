'use client'

import { useState } from 'react'
import { agesKey, type ThemeField } from '@/lib/themeFields'

export type Row = {
  id: string
  name: string
  email: string | null
  phone: string | null
  details: string | null
  status: 'AVAILABLE' | 'SOLD'
  buyerBrandName: string | null
  data: Record<string, string>
}

function parseAges(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const a = JSON.parse(raw)
    return Array.isArray(a) ? a.map(String) : []
  } catch {
    return []
  }
}

export default function ProspectTable({ rows, fields }: { rows: Row[]; fields: ThemeField[] }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const groupFields = fields.filter((f) => f.type === 'group')
  const colSpan = 1 + 3 + fields.length + 1

  const q = search.trim().toLowerCase()
  const filtered = q
    ? rows.filter((r) => {
        const haystack = [r.name, r.email, r.phone, r.details, ...Object.values(r.data)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    : rows

  function isExpandable(r: Row) {
    return !!r.details || groupFields.some((f) => parseAges(r.data[agesKey(f.key)]).length > 0)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-6">
      <div className="p-3 border-b border-gray-100">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un lead (nom, email, téléphone, infos…)"
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          Aucun lead dans ce thème. Ajoutez-en manuellement ou importez un fichier CSV / Excel.
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-10 text-center text-gray-500">Aucun lead ne correspond à « {search} ».</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8" />
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
              {fields.map((f) => (
                <th key={f.key} className="text-left px-4 py-3 font-semibold text-gray-700">{f.label}</th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const expandable = isExpandable(r)
              const open = expanded === r.id
              return (
                <FragmentRow
                  key={r.id}
                  r={r}
                  fields={fields}
                  groupFields={groupFields}
                  expandable={expandable}
                  open={open}
                  colSpan={colSpan}
                  onToggle={() => expandable && setExpanded(open ? null : r.id)}
                />
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function FragmentRow({
  r, fields, groupFields, expandable, open, colSpan, onToggle,
}: {
  r: Row
  fields: ThemeField[]
  groupFields: ThemeField[]
  expandable: boolean
  open: boolean
  colSpan: number
  onToggle: () => void
}) {
  return (
    <>
      <tr
        className={`border-b border-gray-100 transition ${expandable ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-gray-50'}`}
        onClick={onToggle}
      >
        <td className="text-center text-gray-400">
          {expandable && (
            <svg className={`inline w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </td>
        <td className="px-4 py-3 text-gray-900 font-medium">{r.name}</td>
        <td className="px-4 py-3">
          {r.email
            ? <a href={`mailto:${r.email}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">{r.email}</a>
            : <span className="text-gray-400">—</span>}
        </td>
        <td className="px-4 py-3">
          {r.phone
            ? <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline whitespace-nowrap">{r.phone}</a>
            : <span className="text-gray-400">—</span>}
        </td>
        {fields.map((f) => (
          <td key={f.key} className="px-4 py-3 text-gray-600">{r.data[f.key] || '—'}</td>
        ))}
        <td className="px-4 py-3">
          {r.status === 'SOLD' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
              Vendu{r.buyerBrandName ? ` · ${r.buyerBrandName}` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
              En stock
            </span>
          )}
        </td>
      </tr>

      {open && (
        <tr className="bg-blue-50/30 border-b border-gray-100">
          <td />
          <td colSpan={colSpan - 1} className="px-4 py-4">
            <div className="flex flex-wrap gap-6">
              {groupFields.map((f) => {
                const ages = parseAges(r.data[agesKey(f.key)])
                const count = parseInt(r.data[f.key] || '0', 10) || 0
                if (count === 0 && ages.length === 0) return null
                return (
                  <div key={f.key}>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5">{f.label} ({count || ages.length})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: Math.max(count, ages.length) }, (_, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs bg-white border border-gray-200">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">{i + 1}</span>
                          {ages[i]
                            ? <span className="font-semibold text-gray-800">{ages[i]} ans</span>
                            : <span className="text-gray-400 italic">non précisé</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {r.details && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Détails</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap max-w-xl">{r.details}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
