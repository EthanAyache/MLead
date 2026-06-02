import Link from 'next/link'

const pages = [
  { href: '/leads', title: 'Leads', desc: 'Toutes les transactions (achat brand + vente client)', color: 'bg-blue-600' },
  { href: '/clients', title: 'Clients', desc: 'Vos clients qui achètent des leads', color: 'bg-green-600' },
  { href: '/brands', title: 'Brands', desc: 'Vos fournisseurs de leads', color: 'bg-orange-600' },
  { href: '/apporteurs', title: 'Apporteurs', desc: "Les apporteurs d'affaires et leurs commissions", color: 'bg-purple-600' },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-600 text-white p-8">
      <div className="max-w-5xl mx-auto pt-12">
        <h1 className="text-5xl font-bold mb-2">Mr.Lead</h1>
        <p className="text-blue-100 text-lg mb-10">Espace facturation</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6 hover:bg-white/20 transition group"
            >
              <div className={`inline-block w-12 h-12 rounded-lg ${p.color} mb-3 group-hover:scale-110 transition`} />
              <h2 className="text-2xl font-bold mb-1">{p.title}</h2>
              <p className="text-blue-100 text-sm">{p.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}