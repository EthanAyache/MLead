'use client'

import { useState } from 'react'
import EditBrandForm from './EditBrandForm'

type Brand = {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export default function SearchAndList({ brands }: { brands: Brand[] }) {
  const [search, setSearch] = useState('')

  const filtered = brands.filter(b => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.phone?.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 shadow-sm">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom, email ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-xs" title="Effacer">
              ✕
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-500 mt-2">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} pour « {search} »
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {search ? 'Aucune brand ne correspond à votre recherche.' : 'Aucune brand. Cliquez sur « Nouvelle brand » pour commencer.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Nom</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Téléphone</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-semibold text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 text-gray-600">{b.email ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{b.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <EditBrandForm brand={{ id: b.id, name: b.name, email: b.email, phone: b.phone }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}