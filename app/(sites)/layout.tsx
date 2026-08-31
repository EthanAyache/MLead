import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './site.css'

// Root layout SÉPARÉ de celui de Mr.Lead : les sites clients ne doivent recevoir
// ni Tailwind ni les styles du back-office (le reset Tailwind casserait la template).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700'] })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', weight: ['500', '600', '700'] })

export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default function SiteRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  )
}
