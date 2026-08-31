import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Header from '../Header'
import NewInvoiceForm from './NewInvoiceForm'

// Page alimentee par la base : elle doit etre rendue a chaque requete.
// Sans ca, Next la fige au build (donnees perimees, et build impossible sans acces a la base).
export const dynamic = 'force-dynamic'

export default async function NewInvoicePage() {
  const [clients, apporteurs] = await Promise.all([
    prisma.client.findMany({ where: { archived: false }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.apporteur.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  return (
    <div className="min-h-screen bg-[#F2F3F6]">
      <Header />

      <main className="max-w-[1320px] mx-auto px-[22px] py-[22px]">
        {/* Titre + retour */}
        <div className="bg-white border border-[#E8E9EF] rounded-[14px] px-6 py-5 shadow-[0_1px_2px_rgba(20,22,30,.04)] mb-[18px] flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="font-bricolage text-[24px] font-bold text-[#16171D] tracking-tight">
              Nouvelle facture
            </h1>
            <p className="text-[#787C8A] text-sm mt-1">
              Créez une facture distincte : le débiteur indique ce qu'il doit au créditeur.
            </p>
          </div>
          <Link href="/dashboard" className="h-[42px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#16171D] font-semibold text-sm hover:bg-[#FAFAFC] transition flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Retour
          </Link>
        </div>

        {/* Principe */}
        <div className="bg-[#E3EEFD] border border-[#C9DEFB] rounded-[14px] px-5 py-4 mb-[18px] flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center flex-none mt-0.5 text-xs font-bold">i</div>
          <p className="text-[13px] text-[#1E3A8A] leading-relaxed">
            <span className="font-bold">Principe simple :</span> le débiteur est celui qui doit payer. Le créditeur est celui qui doit recevoir.
            Par défaut, on part d'une facture émise <strong>par Mr.Lead</strong> vers un ou plusieurs clients.
          </p>
        </div>

        <NewInvoiceForm clients={clients} apporteurs={apporteurs} />
      </main>

      <footer className="text-center text-xs text-[#787C8A] py-6">
        2026 Mr.Lead — Espace facturation
      </footer>
    </div>
  )
}