'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { agesKey, type ThemeField } from '@/lib/themeFields'

type Parsed = { name: string; email: string; phone: string; details: string; data: Record<string, string> }

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Détecte les colonnes à partir d'un tableau de lignes (chaque ligne = tableau de cellules).
// En-tête optionnel détecté automatiquement. Mappe aussi les champs personnalisés du thème par leur libellé.
function parseRows(rows: string[][], fields: ThemeField[]): Parsed[] {
  const clean = rows.map((r) => r.map((c) => String(c ?? '').trim())).filter((r) => r.some((c) => c !== ''))
  if (clean.length === 0) return []

  const headerKeywords = ['nom', 'name', 'email', 'mail', 'tel', 'phone', 'detail', 'note', 'prenom', ...fields.map((f) => norm(f.label))]
  const first = clean[0].map((c) => norm(c))
  const hasHeader = first.some((c) => headerKeywords.some((k) => c.includes(k)))

  let idx = { name: 0, email: 1, phone: 2, details: 3 }
  // colonne pour chaque champ perso (par défaut -1 = absent)
  const fieldIdx = new Map<string, number>(fields.map((f) => [f.key, -1]))
  let dataRows = clean

  if (hasHeader) {
    const find = (keys: string[]) => first.findIndex((c) => keys.some((k) => c.includes(k)))
    idx = {
      name: Math.max(find(['nom', 'name', 'prenom']), 0),
      email: find(['email', 'mail']),
      phone: find(['tel', 'phone']),
      details: find(['detail', 'note']),
    }
    for (const f of fields) {
      const target = norm(f.label)
      fieldIdx.set(f.key, first.findIndex((c) => c === target || c.includes(target)))
    }
    dataRows = clean.slice(1)
  }

  return dataRows
    .map((cols) => {
      const data: Record<string, string> = {}
      for (const f of fields) {
        const ci = fieldIdx.get(f.key) ?? -1
        if (ci >= 0) {
          const v = (cols[ci] ?? '').trim()
          if (v) data[f.key] = v
        }
      }
      return {
        name: (cols[idx.name] ?? '').trim(),
        email: idx.email >= 0 ? (cols[idx.email] ?? '').trim() : '',
        phone: idx.phone >= 0 ? (cols[idx.phone] ?? '').trim() : '',
        details: idx.details >= 0 ? (cols[idx.details] ?? '').trim() : '',
        data,
      }
    })
    .filter((p) => p.name !== '')
}

// Lit un fichier CSV / XLS / XLSX et renvoie les prospects détectés.
function parseFile(buffer: ArrayBuffer, fields: ThemeField[]): Parsed[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' })
  return parseRows(rows, fields)
}

type ImportResult = { created: number; skipped: number }

export default function ProspectManager({ themeId, fields }: { themeId: string; fields: ThemeField[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<null | 'manual' | 'csv'>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)

  // Manuel
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [details, setDetails] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Import
  const [parsed, setParsed] = useState<Parsed[]>([])
  const [fileName, setFileName] = useState('')
  const [dedupe, setDedupe] = useState(true)

  function close() {
    setMode(null); setError(''); setResult(null)
    setName(''); setEmail(''); setPhone(''); setDetails(''); setFieldValues({})
    setParsed([]); setFileName(''); setDedupe(true)
    router.refresh()
  }

  async function send(prospects: Parsed[]): Promise<ImportResult | null> {
    setLoading(true); setError('')
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId, prospects, dedupe }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || "Erreur lors de l'enregistrement")
      return null
    }
    return res.json()
  }

  // --- Helpers pour les champs "Personnes (avec âges)" ---
  function getAges(key: string): string[] {
    try {
      const a = JSON.parse(fieldValues[agesKey(key)] || '[]')
      return Array.isArray(a) ? a.map(String) : []
    } catch {
      return []
    }
  }
  function setCount(key: string, val: string) {
    const count = Math.max(0, parseInt(val || '0', 10) || 0)
    const ages = getAges(key).slice(0, count)
    const hasAny = ages.some((x) => x.trim() !== '')
    setFieldValues({ ...fieldValues, [key]: val, [agesKey(key)]: hasAny ? JSON.stringify(ages) : '' })
  }
  function setAge(key: string, i: number, val: string) {
    const count = Math.max(0, parseInt(fieldValues[key] || '0', 10) || 0)
    const arr = Array.from({ length: count }, (_, idx) => getAges(key)[idx] ?? '')
    arr[i] = val
    const hasAny = arr.some((x) => x.trim() !== '')
    setFieldValues({ ...fieldValues, [agesKey(key)]: hasAny ? JSON.stringify(arr) : '' })
  }

  async function submitManual(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Le nom est obligatoire'); return }
    const r = await send([{ name, email, phone, details, data: fieldValues }])
    if (!r) return
    if (r.created === 0 && r.skipped > 0) {
      setError('Ce lead existe déjà dans ce thème (même email ou téléphone).')
      return
    }
    close()
  }

  function onFile(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rows = parseFile(reader.result as ArrayBuffer, fields)
        if (rows.length === 0) setError('Aucune ligne valide trouvée (le nom est obligatoire).')
        setParsed(rows)
      } catch {
        setError('Fichier illisible. Formats acceptés : CSV, XLS, XLSX.')
        setParsed([])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  async function submitImport() {
    const r = await send(parsed)
    if (r) setResult(r)
  }

  const inputBase = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

  return (
    <>
      <div className="flex gap-2">
        <button onClick={() => setMode('manual')} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition">
          + Ajouter un lead
        </button>
        <button onClick={() => setMode('csv')} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-lg shadow-sm transition">
          ⬆ Importer (CSV / Excel)
        </button>
      </div>

      {mode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={close}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {mode === 'manual' && (
              <>
                <h2 className="text-xl font-bold mb-4 text-gray-900">Ajouter un lead</h2>
                <form onSubmit={submitManual} className="space-y-3" noValidate>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nom *</label>
                    <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Nom du prospect" className={inputBase} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" className={inputBase} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Téléphone</label>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 12 34 56 78" className={inputBase} />
                    </div>
                  </div>
                  {fields.filter((f) => f.type !== 'group').length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {fields.filter((f) => f.type !== 'group').map((f) => (
                        <div key={f.key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{f.label}</label>
                          <input
                            type={f.type === 'number' ? 'number' : 'text'}
                            value={fieldValues[f.key] ?? ''}
                            onChange={(e) => setFieldValues({ ...fieldValues, [f.key]: e.target.value })}
                            className={inputBase}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {fields.filter((f) => f.type === 'group').map((f) => {
                    const count = Math.min(Math.max(0, parseInt(fieldValues[f.key] || '0', 10) || 0), 30)
                    const ages = getAges(f.key)
                    return (
                      <div key={f.key} className="border border-gray-200 rounded-lg p-3 bg-gray-50/60">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{f.label} (nombre)</label>
                        <input
                          type="number"
                          min={0}
                          value={fieldValues[f.key] ?? ''}
                          onChange={(e) => setCount(f.key, e.target.value)}
                          className={`${inputBase} bg-white`}
                        />
                        {count > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1.5">Âge de chaque personne (optionnel)</p>
                            <div className="grid grid-cols-3 gap-2">
                              {Array.from({ length: count }, (_, i) => (
                                <div key={i}>
                                  <span className="block text-[10px] text-gray-400 mb-0.5">#{i + 1}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    placeholder="âge"
                                    value={ages[i] ?? ''}
                                    onChange={(e) => setAge(f.key, i, e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Détails (champ libre)</label>
                    <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Tout ce qui caractérise ce lead : besoin, budget, message…" className={inputBase} />
                  </div>
                  {error && <p className="text-red-600 text-sm">⚠ {error}</p>}
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                      {loading ? 'Enregistrement…' : 'Ajouter'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {mode === 'csv' && (
              <>
                <h2 className="text-xl font-bold mb-1 text-gray-900">Importer des leads</h2>
                <p className="text-xs text-gray-500 mb-4">
                  Formats : <strong>CSV, XLS, XLSX</strong>. Colonnes reconnues : <strong>nom</strong>, email, téléphone, détails
                  {fields.length > 0 && <> et les champs du thème ({fields.map((f) => f.label).join(', ')})</>}. La ligne d&apos;en-tête (basée sur ces libellés) est détectée automatiquement.
                </p>

                {result ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-lg font-bold text-gray-900">{result.created} lead{result.created > 1 ? 's' : ''} importé{result.created > 1 ? 's' : ''}</p>
                    {result.skipped > 0 && (
                      <p className="text-sm text-gray-500 mt-1">{result.skipped} doublon{result.skipped > 1 ? 's' : ''} ignoré{result.skipped > 1 ? 's' : ''} (email ou téléphone déjà présent)</p>
                    )}
                    <button onClick={close} className="mt-5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">Terminé</button>
                  </div>
                ) : (
                  <>
                    <input type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100" />

                    {parsed.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{parsed.length} lead{parsed.length > 1 ? 's' : ''} détecté{parsed.length > 1 ? 's' : ''} dans « {fileName} »</p>
                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Nom</th>
                                <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Email</th>
                                <th className="text-left px-2 py-1.5 font-semibold text-gray-600">Tél.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {parsed.slice(0, 50).map((p, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                  <td className="px-2 py-1 text-gray-800">{p.name}</td>
                                  <td className="px-2 py-1 text-gray-500">{p.email || '—'}</td>
                                  <td className="px-2 py-1 text-gray-500">{p.phone || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {parsed.length > 50 && <p className="text-xs text-gray-400 mt-1">… et {parsed.length - 50} de plus</p>}
                      </div>
                    )}

                    <label className="flex items-center gap-2 mt-4 text-sm text-gray-700 cursor-pointer select-none">
                      <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      Ignorer les doublons (même email ou téléphone, dans le fichier et le stock existant)
                    </label>

                    {error && <p className="text-red-600 text-sm mt-3">⚠ {error}</p>}

                    <div className="flex gap-2 justify-end pt-4">
                      <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                      <button type="button" disabled={loading || parsed.length === 0} onClick={submitImport} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                        {loading ? 'Import…' : `Importer ${parsed.length || ''} lead${parsed.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
