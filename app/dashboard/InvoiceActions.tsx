'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  invoiceId: string
  invoiceNumber: string
  isPaid: boolean
}

export default function InvoiceActions({ invoiceId, invoiceNumber, isPaid }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function callAction(action: 'mark_paid' | 'archive') {
    setLoading(action)
    await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setLoading(null)
    setToast(action === 'mark_paid' ? `✓ ${invoiceNumber} marquée payée` : `📦 ${invoiceNumber} archivée`)
    setTimeout(() => setToast(null), 2500)
    router.refresh()
  }

  function simulateRemind() {
    setLoading('remind')
    setTimeout(() => {
      setLoading(null)
      setToast(`📨 Relance envoyée pour ${invoiceNumber} (simulation)`)
      setTimeout(() => setToast(null), 2500)
    }, 400)
  }

  const btn = "h-8 px-2.5 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50"

  return (
    <>
      <div className="flex gap-1.5 justify-end flex-wrap">
        {!isPaid && (
          <button
            onClick={() => callAction('mark_paid')}
            disabled={!!loading}
            className={`${btn} bg-white border-[#DCDDE6] text-[#414350] hover:bg-[#E6F5ED] hover:border-[#1F8A53] hover:text-[#1F8A53]`}
            title="Marquer comme payée"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {loading === 'mark_paid' ? '...' : 'Payée'}
          </button>
        )}

        {!isPaid && (
          <button
            onClick={simulateRemind}
            disabled={!!loading}
            className={`${btn} bg-white border-[#DCDDE6] text-[#414350] hover:bg-[#EFEBFD] hover:border-[#6A4FE6] hover:text-[#6A4FE6]`}
            title="Envoyer une relance"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
            {loading === 'remind' ? '...' : 'Relancer'}
          </button>
        )}

        <button
          onClick={() => callAction('archive')}
          disabled={!!loading}
          className={`${btn} bg-white border-[#DCDDE6] text-[#414350] hover:bg-[#FCEAEA] hover:border-[#D23B3B] hover:text-[#D23B3B]`}
          title="Archiver la facture"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21 8v13H3V8M1 3h22v5H1z" />
          </svg>
          {loading === 'archive' ? '...' : 'Archiver'}
        </button>
      </div>

      {/* Toast en bas à droite */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-[#16171D] text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold z-50 animate-[fadeIn_.18s_ease]">
          {toast}
        </div>
      )}
    </>
  )
}