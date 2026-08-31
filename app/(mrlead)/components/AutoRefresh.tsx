'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Rafraîchit les données de la page (server components) à intervalle régulier, sans rechargement visible.
// - Ne tourne que si l'onglet est visible (économise le serveur o2switch, 1 worker).
// - Rafraîchit aussi immédiatement au retour sur l'onglet.
export default function AutoRefresh({ intervalMs = 10000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)

    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, intervalMs])

  return null
}
