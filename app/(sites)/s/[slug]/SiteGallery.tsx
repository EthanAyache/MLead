'use client'

import { useRef, useState } from 'react'

// Carrousel photos de la page publique (port du carrousel de formulaireType/common.js).
export default function SiteGallery({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0)
  const depart = useRef<{ x: number; y: number } | null>(null)

  const total = photos.length
  const aller = (i: number) => { if (total) setIndex((i + total) % total) }

  return (
    <section className="card card--media" aria-labelledby="t-photos">
      <div className="card__head card__head--row">
        <h2 className="card__title card__title--sm" id="t-photos">Galerie photos</h2>
        <span className="counter" aria-live="polite">{total ? index + 1 : 0} / {total}</span>
      </div>

      <div className="slider" tabIndex={0} role="group" aria-roledescription="carrousel"
           aria-label="Photos (flèches gauche et droite pour naviguer)"
           onKeyDown={(e) => {
             if (e.key === 'ArrowLeft') { e.preventDefault(); aller(index - 1) }
             if (e.key === 'ArrowRight') { e.preventDefault(); aller(index + 1) }
           }}>
        <div className="slider__track"
             style={{ transform: `translateX(-${index * 100}%)` }}
             onTouchStart={(e) => { depart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
             onTouchEnd={(e) => {
               const d = depart.current
               depart.current = null
               if (!d) return
               const dx = e.changedTouches[0].clientX - d.x
               const dy = e.changedTouches[0].clientY - d.y
               // Seuil volontairement haut : évite de faire défiler pendant un scroll vertical.
               if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) aller(index + (dx < 0 ? 1 : -1))
             }}>
          {total === 0 ? (
            <div className="slider__empty">Aucune photo pour le moment.</div>
          ) : (
            photos.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- images servies telles quelles depuis /api/uploads
              <img key={src} src={src} alt={`Photo ${i + 1} sur ${total}`}
                   loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
            ))
          )}
        </div>

        {total > 1 && (
          <>
            <button type="button" className="slider__nav slider__nav--prev"
                    onClick={() => aller(index - 1)} aria-label="Photo précédente">
              <svg className="ic" aria-hidden="true"><use href="#i-chev-l" /></svg>
            </button>
            <button type="button" className="slider__nav slider__nav--next"
                    onClick={() => aller(index + 1)} aria-label="Photo suivante">
              <svg className="ic" aria-hidden="true"><use href="#i-chev-r" /></svg>
            </button>
          </>
        )}

        <div className="slider__dots">
          {photos.map((src, i) => (
            <button key={src} type="button" className="dot" aria-label={`Photo ${i + 1}`}
                    aria-current={i === index} onClick={() => aller(i)} />
          ))}
        </div>
      </div>
    </section>
  )
}
