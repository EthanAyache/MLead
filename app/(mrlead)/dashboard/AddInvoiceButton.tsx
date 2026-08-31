import Link from 'next/link'

export default function AddInvoiceButton() {
  return (
    <Link
      href="/dashboard/nouvelle-facture"
      className="h-[42px] px-4 rounded-[11px] bg-[#6A4FE6] hover:bg-[#5840CC] text-white font-semibold text-sm shadow-[0_6px_16px_rgba(106,79,230,.3)] transition flex items-center gap-2"
    >
      <span className="text-lg leading-none">+</span> Nouvelle facture
    </Link>
  )
}