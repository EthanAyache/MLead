// 404 des sites clients : un sous-domaine qui ne correspond à aucun site actif.
export default function SiteNotFound() {
  return (
    <main className="phone">
      <header className="hero">
        <div className="hero__inner">
          <h1 className="hero__brand">Page introuvable</h1>
          <span className="hero__rule" aria-hidden="true"></span>
          <p className="hero__tagline">Cette offre n&apos;est plus en ligne.</p>
        </div>
      </header>
    </main>
  )
}
