'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type MonthlyRow = {
  id: string
  period: string
  clientName: string
  leadCount: number
  amount: number
  status: string
  stripeInvoiceId: string | null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Payée', cls: 'b-paid' },
  SENT: { label: 'À payer', cls: 'b-pending' },
  DRAFT: { label: 'Brouillon', cls: 'b-pending' },
  FAILED: { label: 'Échec', cls: 'b-late' },
}

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function MonthlyInvoicesTab({ rows, isAdmin }: { rows: MonthlyRow[]; isAdmin: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const unpaid = rows.filter((r) => r.status === 'SENT' || r.status === 'FAILED').length

  async function runBilling() {
    if (!confirm("Lancer la facturation du mois ?\n\nChaque client ayant des leads non facturés recevra une facture Stripe, et sera suspendu (ne reçoit plus ses leads) tant qu'il n'a pas payé.")) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/monthly-invoices/run', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg('⚠ ' + (d.error || 'Erreur'))
      } else {
        const results: { status: string }[] = d.results || []
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
    <section className="bg-white border border-[#E8E9EF] rounded-[14px] shadow-[0_1px_2px_rgba(20,22,30,.04),0_6px_24px_rgba(20,22,30,.05)] overflow-hidden">
      <div className="px-5 py-[17px] border-b border-[#E8E9EF] flex items-center gap-2.5 flex-wrap">
        <h2 className="title-badge font-bricolage">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          Factures mensuelles
        </h2>
        <span className="text-[#787C8A] text-[13px] font-medium">
          Pay-per-lead, émises le 28. {rows.length} facture{rows.length > 1 ? 's' : ''}{unpaid > 0 ? ` · ${unpaid} impayée${unpaid > 1 ? 's' : ''}` : ''}.
        </span>
        {isAdmin && (
          <div className="ml-auto flex items-center gap-2.5">
            {msg && <span className="text-xs text-[#414350]">{msg}</span>}
            <button
              onClick={runBilling}
              disabled={busy}
              className="h-9 px-3 rounded-lg bg-[#6A4FE6] hover:bg-[#5840CC] text-white text-sm font-semibold flex items-center gap-2 transition shadow-[0_4px_12px_rgba(106,79,230,.25)] disabled:opacity-60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {busy ? 'Facturation…' : 'Lancer la facturation'}
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center text-[#787C8A] text-sm">
          Aucune facture mensuelle. Elles seront créées automatiquement le 28{isAdmin ? ', ou via « Lancer la facturation »' : ''}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAFC] border-b border-[#E8E9EF]">
              <tr>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Client</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Période</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Leads</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Montant</th>
                <th className="text-left px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Statut</th>
                <th className="text-right px-5 py-3 text-[11.5px] font-bold uppercase tracking-[0.05em] text-[#787C8A]">Stripe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = STATUS[r.status] ?? { label: r.status, cls: 'b-pending' }
                return (
                  <tr key={r.id} className="border-b border-[#E8E9EF] last:border-0 hover:bg-[#FAFAFC] transition">
                    <td className="px-5 py-3.5 font-semibold text-[#16171D]">{r.clientName}</td>
                    <td className="px-5 py-3.5 text-[#414350]">{r.period}</td>
                    <td className="px-5 py-3.5 text-right text-[#414350] num">{r.leadCount}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-[#16171D] num">{fmtEur(r.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${st.cls}`}><span className="b-dot" />{st.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.stripeInvoiceId ? (
                        <a href={`https://dashboard.stripe.com/test/invoices/${r.stripeInvoiceId}`} target="_blank" rel="noopener noreferrer" title="Ouvrir sur Stripe" className="inline-flex w-7 h-7 rounded-md bg-[#635BFF]/10 hover:bg-[#635BFF]/20 text-[#635BFF] items-center justify-center transition">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      ) : (
                        <span className="text-[#C7C9D3]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
