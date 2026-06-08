'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ThemeField } from '@/lib/themeFields'

type Tier = { minQty: string; pricePerLead: string }
type Field = { key?: string; label: string; type: 'text' | 'number' | 'group' }

export type ThemeData = {
  id: string
  name: string
  description: string | null
  pricePerLead: number
  currency: string
  tiers: { minQty: number; pricePerLead: number }[]
  fields: ThemeField[]
}

export default function ThemeForm({ theme }: { theme?: ThemeData }) {
  const router = useRouter()
  const isEdit = !!theme

  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(theme?.name ?? '')
  const [description, setDescription] = useState(theme?.description ?? '')
  const [pricePerLead, setPricePerLead] = useState(theme ? String(theme.pricePerLead) : '')
  const [currency, setCurrency] = useState(theme?.currency ?? 'EUR')
  const [tiers, setTiers] = useState<Tier[]>(
    theme?.tiers.map((t) => ({ minQty: String(t.minQty), pricePerLead: String(t.pricePerLead) })) ?? [],
  )
  const [fields, setFields] = useState<Field[]>(
    theme?.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })) ?? [],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function resetToInitial() {
    setName(theme?.name ?? '')
    setDescription(theme?.description ?? '')
    setPricePerLead(theme ? String(theme.pricePerLead) : '')
    setCurrency(theme?.currency ?? 'EUR')
    setTiers(theme?.tiers.map((t) => ({ minQty: String(t.minQty), pricePerLead: String(t.pricePerLead) })) ?? [])
    setFields(theme?.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })) ?? [])
    setError('')
  }

  function addField() {
    setFields([...fields, { label: '', type: 'text' }])
  }
  function updateField(i: number, key: 'label' | 'type', value: string) {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)))
  }
  function removeField(i: number) {
    setFields(fields.filter((_, idx) => idx !== i))
  }

  function addTier() {
    setTiers([...tiers, { minQty: '', pricePerLead: '' }])
  }
  function updateTier(i: number, field: keyof Tier, value: string) {
    setTiers(tiers.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))
  }
  function removeTier(i: number) {
    setTiers(tiers.filter((_, idx) => idx !== i))
  }

  function close() {
    setIsOpen(false)
    setError('')
    if (isEdit) resetToInitial()
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { setError('Le nom est obligatoire'); return }
    if (!pricePerLead || parseFloat(pricePerLead) < 0) { setError('Prix par lead invalide'); return }
    setLoading(true)
    setError('')
    const res = await fetch(isEdit ? `/api/themes/${theme!.id}` : '/api/themes', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, pricePerLead, currency, tiers, fields }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || (isEdit ? 'Erreur lors de la modification' : 'Erreur lors de la création'))
      return
    }
    if (!isEdit) resetToInitial()
    setIsOpen(false)
    router.refresh()
  }

  const sym = currency === 'EUR' ? '€' : currency === 'ILS' ? '₪' : '$'
  const inputBase = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'

  return (
    <>
      {isEdit ? (
        <button
          onClick={() => setIsOpen(true)}
          className="h-[38px] px-3 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition flex items-center gap-1.5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Modifier
        </button>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition">
          + Nouveau thème
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={close}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-900">{isEdit ? 'Modifier le thème' : 'Nouveau thème'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom du thème *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Voyage cacher, Assurance auto…" className={inputBase} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description (optionnel)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="À qui s'adressent ces leads ?" className={inputBase} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prix de base par lead *</label>
                <div className="flex gap-2">
                  <input type="number" step="0.01" value={pricePerLead} onChange={(e) => setPricePerLead(e.target.value)} placeholder="15.00" className={`flex-1 ${inputBase}`} />
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-gray-900">
                    <option value="EUR">€</option>
                    <option value="ILS">₪</option>
                    <option value="USD">$</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Paliers de remise (optionnel)</label>
                  <button type="button" onClick={addTier} className="text-xs font-semibold text-blue-600 hover:text-blue-700">+ Ajouter un palier</button>
                </div>
                {tiers.length === 0 && (
                  <p className="text-xs text-gray-400">Ex : à partir de 50 leads, 12 {sym}/lead au lieu du prix de base.</p>
                )}
                <div className="space-y-2">
                  {tiers.map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">à partir de</span>
                      <input type="number" value={t.minQty} onChange={(e) => updateTier(i, 'minQty', e.target.value)} placeholder="50" className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 text-sm" />
                      <span className="text-xs text-gray-500">leads →</span>
                      <input type="number" step="0.01" value={t.pricePerLead} onChange={(e) => updateTier(i, 'pricePerLead', e.target.value)} placeholder="12.00" className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 text-sm" />
                      <span className="text-xs text-gray-500">{sym}/lead</span>
                      <button type="button" onClick={() => removeTier(i)} className="text-red-500 hover:text-red-600 text-sm ml-auto">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Champs personnalisés du lead (optionnel)</label>
                  <button type="button" onClick={addField} className="text-xs font-semibold text-blue-600 hover:text-blue-700">+ Ajouter un champ</button>
                </div>
                {fields.length === 0 && (
                  <p className="text-xs text-gray-400">Ex. pour un thème voyage : « Adultes », « Enfants » (type « Personnes »). Le contact (nom, email, tél) est déjà géré.</p>
                )}
                {isEdit && fields.length > 0 && (
                  <p className="text-xs text-amber-600 mb-1">⚠ Renommer un champ déjà utilisé peut détacher les valeurs déjà saisies sur les leads existants.</p>
                )}
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={f.label} onChange={(e) => updateField(i, 'label', e.target.value)} placeholder="Nom du champ (ex: Enfants)" className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 text-sm" />
                      <select value={f.type} onChange={(e) => updateField(i, 'type', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 text-sm">
                        <option value="text">Texte</option>
                        <option value="number">Nombre</option>
                        <option value="group">Personnes (avec âges)</option>
                      </select>
                      <button type="button" onClick={() => removeField(i)} className="text-red-500 hover:text-red-600 text-sm">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">⚠ {error}</p>}

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" onClick={close} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50">
                  {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le thème'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
