import { prisma } from '@/lib/prisma'
import Header from './Header'
import Kpis from './Kpis'
import DashboardTabs from './DashboardTabs'

export default async function DashboardPage() {
  const [unpaidCount, clientsCount, historyCount, brandsCount, apporteursCount, brands, clients, apporteurs, invoices] = await Promise.all([
    prisma.invoice.count({ where: { archived: false, status: { in: ['PENDING', 'LATE'] } } }),
    prisma.client.count({ where: { archived: false } }),
    prisma.invoice.count({ where: { status: 'PAID' } }),
    prisma.brand.count({ where: { archived: false } }),
    prisma.apporteur.count({ where: { archived: false } }),
    prisma.brand.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.client.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.apporteur.findMany({ where: { archived: false }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.invoice.findMany({
      where: { archived: false },
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
      },
    }),
  ])

  const counts = {
    factures: unpaidCount,
    clients: clientsCount,
    historique: historyCount,
    brands: brandsCount,
    apporteurs: apporteursCount,
  }

  // Sérialiser les dates pour pouvoir passer au client component
  const invoicesSerialized = invoices.map(i => ({
    ...i,
    dueDate: i.dueDate.toISOString(),
  }))

  return (
    <div className="min-h-screen bg-[#F2F3F6]">
      <Header />

      <main className="max-w-[1320px] mx-auto px-[22px] py-[22px]">
        <div className="flex items-start gap-4 flex-wrap mb-[18px] mt-2">
          <div>
            <h1 className="font-bricolage text-[27px] font-bold text-[#16171D] tracking-tight">
              Soldes &amp; Créances
            </h1>
            <p className="text-[#787C8A] text-sm mt-1 max-w-[560px]">
              Suivez qui doit quoi à qui : factures dues par vos clients, sommes dues à vos brands et apporteurs.
            </p>
          </div>
          <div className="ml-auto flex gap-2.5 flex-wrap">
            <button className="h-[42px] px-4 rounded-[11px] bg-white border border-[#DCDDE6] text-[#16171D] font-semibold text-sm hover:bg-[#FAFAFC] transition">
              Archives
            </button>
            <button className="h-[42px] px-4 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition flex items-center gap-2">
              <span className="text-lg leading-none">+</span> Nouvelle facture
            </button>
          </div>
        </div>

        <Kpis />
        <DashboardTabs counts={counts} brands={brands} clients={clients} apporteurs={apporteurs} invoices={invoicesSerialized} />
      </main>
    </div>
  )
}