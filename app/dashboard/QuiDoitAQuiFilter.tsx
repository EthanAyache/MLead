'use client'

import { useState } from 'react'

export type FilterValue = {
  debtorType: string
  debtorName: string
  creditorType: string
  creditorName: string
}

type Option = { id: string; name: string }

type Props = {
  brands: Option[]
  clients: Option[]
  apporteurs: Option[]
  onApply: (value: FilterValue) => void
}

const TYPES = [
  { value: '', label: 'Tous' },
  { value: 'client', label: 'Client' },
  { value: 'brand', label: 'Brand' },
  { value: 'apporteur', label: "Apporteur d'affaires" },
  { value: 'user', label: 'Mr.Lead (interne)' },
]

const LABELS: Record<string, string> = {
  client: 'Client',
  brand: 'Brand',
  apporteur: "Apporteur d'affaires",
  user: 'Mr.Lead',
}

export default function QuiDoitAQuiFilter({ brands, clients, apporteurs, onApply }: Props) {
  const [debtorType, setDebtorType] = useState('')
  const [debtorName, setDebtorName] = useState('')
  const [creditorType, setCreditorType] = useState('')
  const [creditorName, setCreditorName] = useState('')

  function namesFor(type: string): Option[] {
    if (type === 'client') return clients
    if (type === 'brand') return brands
    if (type === 'apporteur') return apporteurs
    if (type === 'user') return [{ id: 'mrlead', name: 'Mr.Lead (interne)' }]
    return []
  }

  function reset() {
    setDebtorType(''); setDebtorName(''); setCreditorType(''); setCreditorName('')
    onApply({ debtorType: '', debtorName: '', creditorType: '', creditorName: '' })
  }

  return (
    <div className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] mb-[18px] overflow-hidden">
      {/* En-tête avec titre badge */}
      <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
        <h2 className="title-badge font-bricolage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
          </svg>
          Filtrer les dettes
        </h2>
        <span className="text-[#787C8A] text-[13px] font-medium">
          Reliez qui doit quoi à qui : choisissez le type de compte de chaque côté.
        </span>
      </div>

      {/* Corps */}
      <div className="px-5 py-[18px]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_200px] gap-3.5 items-stretch">
          {/* Boîte QUI DOIT */}
          <div className="bg-[#F4F1FE] border border-[#E1DAFA] rounded-xl p-4 flex flex-col">
            <span className="pill-tag pill-debit">Qui doit</span>
            <label className="block text-[13px] text-[#414350] mb-1.5 font-medium">Type de compte</label>
            <select
              value={debtorType}
              onChange={(e) => { setDebtorType(e.target.value); setDebtorName('') }}
              className="w-full h-[42px] bg-white border border-[#DCDDE6] rounded-[10px] px-3 text-sm text-[#16171D] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6]"
            >
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {debtorType && (
              <div className="mt-2.5">
                <label className="block text-[13px] text-[#414350] mb-1.5 font-medium">{LABELS[debtorType]}</label>
                <input
                  list="dl-debtor"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  placeholder={`Tapez le nom du ${LABELS[debtorType].toLowerCase()}…`}
                  className="w-full h-[42px] bg-white border border-[#DCDDE6] rounded-[10px] px-3 text-sm text-[#16171D] placeholder:text-[#787C8A] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6]"
                />
                <datalist id="dl-debtor">
                  {namesFor(debtorType).map(o => <option key={o.id} value={o.name} />)}
                </datalist>
                <span className="block text-[11.5px] text-[#787C8A] mt-1.5">Commencez à taper pour filtrer.</span>
              </div>
            )}
          </div>

          {/* Boîte À QUI */}
          <div className="bg-[#F4F1FE] border border-[#E1DAFA] rounded-xl p-4 flex flex-col">
            <span className="pill-tag pill-credit">À qui</span>
            <label className="block text-[13px] text-[#414350] mb-1.5 font-medium">Type de compte</label>
            <select
              value={creditorType}
              onChange={(e) => { setCreditorType(e.target.value); setCreditorName('') }}
              className="w-full h-[42px] bg-white border border-[#DCDDE6] rounded-[10px] px-3 text-sm text-[#16171D] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6]"
            >
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {creditorType && (
              <div className="mt-2.5">
                <label className="block text-[13px] text-[#414350] mb-1.5 font-medium">{LABELS[creditorType]}</label>
                <input
                  list="dl-creditor"
                  value={creditorName}
                  onChange={(e) => setCreditorName(e.target.value)}
                  placeholder={`Tapez le nom du ${LABELS[creditorType].toLowerCase()}…`}
                  className="w-full h-[42px] bg-white border border-[#DCDDE6] rounded-[10px] px-3 text-sm text-[#16171D] placeholder:text-[#787C8A] focus:outline-none focus:ring-2 focus:ring-[#6A4FE6]"
                />
                <datalist id="dl-creditor">
                  {namesFor(creditorType).map(o => <option key={o.id} value={o.name} />)}
                </datalist>
                <span className="block text-[11.5px] text-[#787C8A] mt-1.5">Commencez à taper pour filtrer.</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5 justify-center">
            <button
              onClick={() => onApply({ debtorType, debtorName, creditorType, creditorName })}
              className="h-[46px] px-4 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
              </svg>
              Filtrer
            </button>
            <button
              onClick={reset}
              className="h-[46px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#16171D] font-semibold text-sm hover:bg-[#FAFAFC] transition flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 3v5h5" />
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
              </svg>
              Réinitialiser
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}