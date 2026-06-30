'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Result = { status: string }

// Déclenche manuellement la facturation mensuelle (POST /api/monthly-invoices/run, admin).
export default function RunBillingButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    if (!confirm("Lancer la facturation du mois ?\n\nChaque client ayant des leads non facturés recevra une facture Stripe, et sera suspendu (ne reçoit plus ses leads) tant qu'il n'a pas payé.")) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/monthly-invoices/run', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg('⚠ ' + (d.error || 'Erreur'))
      } else {
        const results: Result[] = d.results || []
        const sent = results.filter((r) => r.status === 'SENT').length
        const failed = results.filter((r) => r.status === 'FAILED').length
        setMsg(`✓ ${sent} facture(s) émise(s) pour ${d.period}${failed > 0 ? ` · ${failed} échec(s)` : ''}.`)
        router.refresh()
      }
    } catch {
      setMsg('⚠ Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={busy}
        className="h-[42px] px-4 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition flex items-center gap-2 disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        {busy ? 'Facturation…' : 'Lancer la facturation'}
      </button>
      {msg && <span className="text-xs text-[#414350] max-w-[260px] text-right">{msg}</span>}
    </div>
  )
}
