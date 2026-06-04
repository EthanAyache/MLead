'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Option = { id: string; name: string; email?: string | null }
type EntityType = 'CLIENT' | 'BRAND' | 'APPORTEUR'

type Props = {
  clients: Option[]
  brands: Option[]
  apporteurs: Option[]
}

const TYPES: { v: EntityType; label: string }[] = [
  { v: 'CLIENT', label: 'Client' },
  { v: 'BRAND', label: 'Brand' },
  { v: 'APPORTEUR', label: "Apporteur" },
]

const MRLEAD = { id: 'mrlead', name: 'Mr.Lead (interne)' }

export default function NewInvoiceForm({ clients, brands, apporteurs }: Props) {
  const router = useRouter()

  const [debtorType, setDebtorType] = useState<EntityType>('CLIENT')
  const [debtorId, setDebtorId] = useState('')
  const [creditorType, setCreditorType] = useState<EntityType>('BRAND')
  const [creditorId, setCreditorId] = useState('mrlead')

  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
  const [label, setLabel] = useState('')

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pour le type "Brand", Mr.Lead est proposé en premier (et sélectionné par défaut).
  function optionsFor(type: EntityType): Option[] {
    if (type === 'CLIENT') return clients
    if (type === 'BRAND') return [MRLEAD, ...brands]
    return apporteurs
  }

  // Au changement de type : Brand -> Mr.Lead par défaut, sinon "à choisir".
  function defaultIdFor(type: EntityType) {
    return type === 'BRAND' ? 'mrlead' : ''
  }

  function validate() {
    const e: Record<string, string> = {}
    const debtorIsMrlead = debtorType === 'BRAND' && debtorId === 'mrlead'
    const creditorIsMrlead = creditorType === 'BRAND' && creditorId === 'mrlead'

    if (!debtorId) e.debtorId = 'Sélectionnez un débiteur'
    if (!creditorId) e.creditorId = 'Sélectionnez un créditeur'
    if (debtorType === creditorType && debtorId === creditorId) {
      e.same = 'Le débiteur et le créditeur ne peuvent pas être identiques.'
    } else if (debtorType === creditorType && !debtorIsMrlead && !creditorIsMrlead) {
      e.same = 'Les deux côtés ne peuvent pas être du même type. Mets Mr.Lead d\'un côté.'
    }
    if (!number.trim()) e.number = 'Numéro obligatoire (ex: FA-2026-001)'
    if (!amount || parseFloat(amount) <= 0) e.amount = 'Montant invalide'
    if (!dueDate) e.dueDate = "Date d'échéance obligatoire"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)

    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, amount, currency, dueDate, label, debtorType, debtorId, creditorType, creditorId }),
    })

    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  const inputBase = "w-full h-[42px] border rounded-[10px] px-3 text-[#16171D] placeholder:text-[#787C8A] focus:outline-none focus:ring-2 focus:border-transparent transition text-sm bg-white"
  const ok = "border-[#DCDDE6] focus:ring-[#6A4FE6]"
  const err = "border-[#D23B3B] bg-[#FCEAEA] focus:ring-[#D23B3B]"

  // Bloc de boutons de type (Client / Brand / Apporteur)
  function TypeButtons({ value, onPick }: { value: EntityType; onPick: (t: EntityType) => void }) {
    return (
      <div className="flex gap-2 mb-3">
        {TYPES.map((t) => (
          <button
            key={t.v}
            type="button"
            onClick={() => onPick(t.v)}
            className={`flex-1 h-[42px] rounded-[10px] border font-semibold text-sm transition ${
              value === t.v
                ? 'bg-[#EFEBFD] border-[#6A4FE6] text-[#6A4FE6]'
                : 'bg-white border-[#DCDDE6] text-[#414350] hover:bg-[#FAFAFC]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-[18px]">
      {errors.same && (
        <div className="bg-[#FCEAEA] border border-[#F5C5C5] rounded-[10px] px-4 py-3 text-[13px] text-[#D23B3B] font-semibold">
          ⚠ {errors.same}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
        <section className="bg-white border border-[#E8E9EF] rounded-[14px] p-5 shadow-[0_1px_2px_rgba(20,22,30,.04)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="pill-tag pill-debit">1. Qui doit ?</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#FCEAEA] flex items-center justify-center text-[#D23B3B]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </div>
          </div>

          <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">Type de compte</label>
          <TypeButtons value={debtorType} onPick={(t) => { setDebtorType(t); setDebtorId(defaultIdFor(t)) }} />

          <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">Sélection du débiteur</label>
          <select value={debtorId} onChange={(e) => { setDebtorId(e.target.value); setErrors({ ...errors, debtorId: '' }) }} className={`${inputBase} ${errors.debtorId ? err : ok}`}>
            <option value="">— Choisir —</option>
            {optionsFor(debtorType).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {errors.debtorId && <p className="text-[#D23B3B] text-xs mt-1.5">⚠ {errors.debtorId}</p>}
          <p className="text-[11.5px] text-[#787C8A] mt-2">Ce compte doit payer la facture.</p>
        </section>

        <section className="bg-white border border-[#E8E9EF] rounded-[14px] p-5 shadow-[0_1px_2px_rgba(20,22,30,.04)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="pill-tag pill-credit">2. À qui ?</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#E6F5ED] flex items-center justify-center text-[#1F8A53]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M17 7L7 17M7 17h9M7 17V8" />
              </svg>
            </div>
          </div>

          <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">Type de compte</label>
          <TypeButtons value={creditorType} onPick={(t) => { setCreditorType(t); setCreditorId(defaultIdFor(t)) }} />

          <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">Sélection du créditeur</label>
          <select value={creditorId} onChange={(e) => { setCreditorId(e.target.value); setErrors({ ...errors, creditorId: '' }) }} className={`${inputBase} ${errors.creditorId ? err : ok}`}>
            <option value="">— Choisir —</option>
            {optionsFor(creditorType).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {errors.creditorId && <p className="text-[#D23B3B] text-xs mt-1.5">⚠ {errors.creditorId}</p>}
          <p className="text-[11.5px] text-[#787C8A] mt-2">Ce compte recevra le paiement.</p>
        </section>
      </div>

      <section className="bg-white border border-[#E8E9EF] rounded-[14px] p-5 shadow-[0_1px_2px_rgba(20,22,30,.04)]">
        <div className="flex items-center gap-3 mb-4">
          <span className="pill-tag" style={{ background: '#E3EEFD', color: '#2563EB' }}>3. Quoi ?</span>
          <h2 className="font-bricolage text-[17px] font-bold text-[#16171D]">Valeur de la facture</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">N° de facture</label>
            <input value={number} onChange={(e) => { setNumber(e.target.value); setErrors({ ...errors, number: '' }) }} placeholder="FA-2026-001" className={`${inputBase} ${errors.number ? err : ok}`} />
            {errors.number && <p className="text-[#D23B3B] text-xs mt-1">⚠ {errors.number}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">Montant</label>
            <div className="flex gap-1.5">
              <input type="number" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setErrors({ ...errors, amount: '' }) }} placeholder="0.00" className={`flex-1 ${inputBase} ${errors.amount ? err : ok}`} />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-[42px] border border-[#DCDDE6] rounded-[10px] px-2 text-sm bg-white">
                <option value="EUR">€</option>
                <option value="ILS">₪</option>
                <option value="USD">$</option>
              </select>
            </div>
            {errors.amount && <p className="text-[#D23B3B] text-xs mt-1">⚠ {errors.amount}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">Date d'échéance</label>
            <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setErrors({ ...errors, dueDate: '' }) }} className={`${inputBase} ${errors.dueDate ? err : ok}`} />
            {errors.dueDate && <p className="text-[#D23B3B] text-xs mt-1">⚠ {errors.dueDate}</p>}
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#414350] mb-1.5">Libellé</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: leads mai" className={`${inputBase} ${ok}`} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 flex-wrap justify-between bg-white border border-[#E8E9EF] rounded-[14px] px-5 py-4 shadow-[0_1px_2px_rgba(20,22,30,.04)]">
        <p className="text-[13px] text-[#787C8A] flex-1 min-w-0">
          Vérifiez les comptes, puis enregistrez la facture pour qu'elle apparaisse dans le dashboard.
        </p>
        <div className="flex gap-2">
          <Link href="/dashboard" className="h-[42px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#414350] font-semibold text-sm hover:bg-[#FAFAFC] transition flex items-center">
            Annuler
          </Link>
          <button type="submit" disabled={loading} className="h-[42px] px-5 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition disabled:opacity-50 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            {loading ? 'Enregistrement...' : 'Enregistrer la facture'}
          </button>
        </div>
      </div>
    </form>
  )
}
