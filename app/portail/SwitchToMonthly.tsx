'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SwitchToMonthly() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function switchMode() {
    if (!confirm('Passer à la facturation mensuelle ? Vous serez facturé chaque mois selon les leads reçus, sans avance de solde.')) return
    setBusy(true)
    const res = await fetch('/api/portal/billing-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'MONTHLY' }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
  }

  return (
    <button
      onClick={switchMode}
      disabled={busy}
      className="text-sm font-semibold text-[#6A4FE6] hover:underline disabled:opacity-50"
    >
      {busy ? '…' : 'Passer à la facturation mensuelle'}
    </button>
  )
}
