import type { ReactNode } from 'react'

export const metadata = { title: 'Espace client — MonsieurLead' }

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-[#F7F8FB] text-[#16171D]">{children}</div>
}
