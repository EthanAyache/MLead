'use client'

import { useState } from 'react'
import { formatEuros, ttcFromHt, TVA_PERCENT } from '@/lib/tva'

export default function RechargeForm({ avgPrice }: { avgPrice: number }) {
  const hasPrice = avgPrice > 0
  const [mode, setMode] = useState<'leads' | 'amount'>(hasPrice ? 'leads' : 'amount')
  const [leads, setLeads] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Montant HT à payer selon le mode choisi.
  const nLeads = parseInt(leads, 10)
  const amtInput = parseFloat(amount)
  const amountHT =
    mode === 'leads'
      ? (Number.isFinite(nLeads) && nLeads > 0 ? nLeads * avgPrice : 0)
      : (Number.isFinite(amtInput) && amtInput > 0 ? amtInput : 0)
  const estLeads = hasPrice && amountHT > 0 ? Math.floor(amountHT / avgPrice) : null
  const valid = amountHT > 0

  async function pay() {
    setError('')
    if (!valid) { setError('Choisissez un montant.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/portal/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amountHT * 100) / 100 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Une erreur est survenue.'); setBusy(false); return }
      if (data.payUrl) {
        window.location.href = data.payUrl // page de paiement Stripe hébergée
      } else {
        setError('Lien de paiement indisponible. Réessayez.')
        setBusy(false)
      }
    } catch {
      setError('Erreur réseau. Réessayez.')
      setBusy(false)
    }
  }

  const seg = 'flex-1 h-10 rounded-lg text-sm font-semibold transition focus:outline-none'
  const inputCls = 'h-12 w-full rounded-xl border border-[#DCDDE6] bg-white px-4 text-[15px] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#6A4FE6]'

  return (
    <div className="rounded-2xl border border-[#E8E9EF] bg-white p-6">
      {/* Bascule leads / montant */}
      {hasPrice && (
        <div className="mb-5 flex gap-1 rounded-xl bg-[#F1F2F6] p-1" role="tablist" aria-label="Choisir le mode d'achat">
          <button role="tab" aria-selected={mode === 'leads'} onClick={() => { setMode('leads'); setError('') }} className={`${seg} ${mode === 'leads' ? 'bg-white text-[#16171D] shadow-[0_1px_2px_rgba(20,22,30,.08)]' : 'text-[#787C8A]'}`}>
            Par nombre de leads
          </button>
          <button role="tab" aria-selected={mode === 'amount'} onClick={() => { setMode('amount'); setError('') }} className={`${seg} ${mode === 'amount' ? 'bg-white text-[#16171D] shadow-[0_1px_2px_rgba(20,22,30,.08)]' : 'text-[#787C8A]'}`}>
            Par montant
          </button>
        </div>
      )}

      {mode === 'leads' && hasPrice ? (
        <div>
          <label htmlFor="leads" className="block text-sm font-semibold text-[#414350]">Combien de leads souhaitez-vous ?</label>
          <input id="leads" type="number" inputMode="numeric" min={1} step={1} value={leads} onChange={(e) => { setLeads(e.target.value); setError('') }} placeholder="20" className={`mt-1.5 ${inputCls}`} />
          <p className="mt-1.5 text-xs text-[#787C8A]">Prix moyen : {formatEuros(avgPrice)} HT / lead.</p>
        </div>
      ) : (
        <div>
          <label htmlFor="amount" className="block text-sm font-semibold text-[#414350]">Quel montant souhaitez-vous créditer ?</label>
          <div className="mt-1.5 flex items-center gap-2">
            <input id="amount" type="number" inputMode="decimal" min={1} step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setError('') }} placeholder="200" className={inputCls} />
            <span className="text-[15px] font-semibold text-[#787C8A]">€ HT</span>
          </div>
          {hasPrice && <p className="mt-1.5 text-xs text-[#787C8A]">Prix moyen : {formatEuros(avgPrice)} HT / lead.</p>}
        </div>
      )}

      {/* Récapitulatif */}
      <div className="mt-5 rounded-xl bg-[#FAFAFC] border border-[#EEF0F5] px-4 py-3.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#787C8A]">Montant HT</span>
          <span className="font-semibold text-[#16171D]">{formatEuros(amountHT)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-[#787C8A]">TVA {TVA_PERCENT} %</span>
          <span className="text-[#414350]">{formatEuros(ttcFromHt(amountHT) - amountHT)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-[#EEF0F5] pt-2">
          <span className="font-semibold text-[#16171D]">Total à payer</span>
          <span className="font-bricolage text-lg font-extrabold text-[#16171D]">{formatEuros(ttcFromHt(amountHT))}</span>
        </div>
        {estLeads !== null && amountHT > 0 && (
          <p className="mt-2 text-xs text-[#787C8A]">Soit ≈ <strong className="text-[#414350]">{estLeads} lead{estLeads > 1 ? 's' : ''}</strong> crédité{estLeads > 1 ? 's' : ''} à votre solde.</p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-[#D23B3B]" role="alert">⚠ {error}</p>}

      <button
        onClick={pay}
        disabled={busy || !valid}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-[#059669] px-4 font-semibold text-white transition hover:bg-[#047857] focus:outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2 disabled:opacity-50"
      >
        {busy ? 'Redirection…' : valid ? `Payer ${formatEuros(ttcFromHt(amountHT))}` : 'Payer'}
      </button>
      <p className="mt-3 text-center text-xs text-[#9AA0AE]">Paiement sécurisé par carte via Stripe. Votre solde est crédité dès le paiement confirmé.</p>
    </div>
  )
}
