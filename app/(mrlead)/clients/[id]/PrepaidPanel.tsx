'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuros, ttcFromHt, TVA_PERCENT } from '@/lib/tva'

export type Topup = {
  id: string
  amount: number
  status: 'PENDING' | 'PAID' | 'FAILED' | 'MANUAL'
  note: string | null
  createdAt: string
}

const STATUS: Record<Topup['status'], { label: string; cls: string }> = {
  PAID: { label: 'Payé', cls: 'bg-green-50 text-green-700 border-green-200' },
  MANUAL: { label: 'Manuel', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  PENDING: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  FAILED: { label: 'Échoué', cls: 'bg-red-50 text-red-600 border-red-200' },
}

export default function PrepaidPanel({
  clientId, prepaidBalance, avgPrice, topups,
}: {
  clientId: string
  prepaidBalance: number
  avgPrice: number // prix moyen HT par lead sur les sites prépayés du client (0 si aucun)
  topups: Topup[]
}) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const amt = parseFloat(amount)
  const estLeads = avgPrice > 0 && amt > 0 ? Math.floor(amt / avgPrice) : null

  async function recharge(payMode: 'manual' | 'stripe') {
    setError(''); setMsg('')
    if (!(amt > 0)) { setError('Montant invalide'); return }
    setBusy(true)
    const res = await fetch(`/api/clients/${clientId}/prepaid`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: payMode, amount: amt, note }),
    })
    setBusy(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'Erreur'); return }
    setAmount(''); setNote('')
    setMsg(payMode === 'manual' ? 'Solde crédité.' : 'Facture Stripe envoyée au client. Le solde sera crédité au paiement.')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Solde prépayé (partagé)</h2>
      <p className="mt-1 text-xs text-gray-500">Porte-monnaie du client, utilisé par ses sites en formule « prépayé ». La formule se règle site par site.</p>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap bg-violet-50 border border-violet-100 rounded-lg px-4 py-3">
        <div>
          <div className="text-xs font-semibold text-violet-700 uppercase">Solde (HT)</div>
          <div className="text-2xl font-bold text-violet-800">{formatEuros(prepaidBalance)}</div>
        </div>
        <div className="text-xs text-violet-700/80 text-right">
          {avgPrice > 0 ? <>≈ {Math.floor(prepaidBalance / avgPrice)} lead(s)<br />(prix moyen {formatEuros(avgPrice)}/lead)</> : 'aucun site prépayé payant'}
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4 mt-4">
        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Recharger le solde</div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Montant (€ HT)</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200.00" className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Note (optionnel)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex: pack de démarrage" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        {amt > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {estLeads !== null && <>≈ <strong>{estLeads} lead(s)</strong> · </>}
            Facture Stripe : <strong>{formatEuros(ttcFromHt(amt))} TTC</strong> (TVA {TVA_PERCENT} %)
          </p>
        )}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={() => recharge('stripe')} disabled={busy} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50">Envoyer une facture Stripe</button>
          <button onClick={() => recharge('manual')} disabled={busy} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">Créditer à la main</button>
        </div>
        {error && <p className="text-red-600 text-sm mt-2">⚠ {error}</p>}
        {msg && <p className="text-green-700 text-sm mt-2">✓ {msg}</p>}
      </div>

      {topups.length > 0 && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <div className="text-xs font-bold text-gray-500 uppercase mb-2">Historique des recharges</div>
          <div className="space-y-1.5">
            {topups.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500 text-xs w-28 shrink-0">{new Date(t.createdAt).toLocaleDateString('fr-FR')}</span>
                <span className="font-semibold text-gray-800">{formatEuros(t.amount)}</span>
                <span className="text-gray-500 text-xs flex-1 truncate">{t.note || ''}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS[t.status].cls}`}>{STATUS[t.status].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
