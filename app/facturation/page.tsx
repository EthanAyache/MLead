export const revalidate = 30

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, visibilityFilter } from '@/lib/auth'
import Header from '@/app/dashboard/Header'
import RunBillingButton from './RunBillingButton'

// Libellé + couleur de badge par statut de facture mensuelle.
const STATUS: Record<string, { label: string; cls: string }> = {
  PAID: { label: 'Payée', cls: 'b-paid' },
  SENT: { label: 'À payer', cls: 'b-pending' },
  DRAFT: { label: 'Brouillon', cls: 'b-pending' },
  FAILED: { label: 'Échec', cls: 'b-late' },
}

function fmtEur(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default async function FacturationPage() {
  const me = await getCurrentUser()
  if (!me) redirect('/login')
  const filter = visibilityFilter(me)
  const isAdmin = me.role === 'ADMIN'

  const monthly = await prisma.monthlyInvoice.findMany({
    where: { client: { ...filter } },
    orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
    include: { client: { select: { id: true, name: true } } },
  })

  const rows = monthly.map((m) => ({
    id: m.id,
    period: m.period,
    clientName: m.client.name,
    leadCount: m.leadCount,
    amount: m.amount,
    status: m.status,
    stripeInvoiceId: m.stripeInvoiceId,
  }))

  const unpaidCount = rows.filter((r) => r.status === 'SENT' || r.status === 'FAILED').length

  return (
    <div className="min-h-screen bg-[#F2F3F6]">
      <Header />
      <main className="max-w-[1320px] mx-auto px-[22px] py-[22px]">
        <div className="flex items-start gap-4 flex-wrap mb-[18px] mt-2">
          <div>
            <Link href="/dashboard" className="text-sm text-[#6A4FE6] hover:underline font-medium">← Retour au dashboard</Link>
            <h1 className="font-bricolage text-[27px] font-bold text-[#16171D] tracking-tight mt-1">Facturation mensuelle</h1>
            <p className="text-[#787C8A] text-sm mt-1 max-w-[620px]">
              Factures pay-per-lead émises automatiquement le 28 de chaque mois (nb de leads × prix du site).
              Tant qu&apos;une facture est impayée, le client est <strong>suspendu</strong> : il ne reçoit plus ses leads (copie envoyée à JBoost).
            </p>
          </div>
          {isAdmin && (
            <div className="ml-auto">
              <RunBillingButton />
            </div>
          )}
        </div>

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
              {rows.length} facture{rows.length > 1 ? 's' : ''}{unpaidCount > 0 ? ` · ${unpaidCount} impayée${unpaidCount > 1 ? 's' : ''}` : ''}.
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="p-12 text-center text-[#787C8A] text-sm">
              Aucune facture mensuelle pour le moment. Elles seront créées automatiquement le 28, ou via « Lancer la facturation ».
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
      </main>
    </div>
  )
}
