/* =========================================================
   Template Voyage Cacher — Store partagé entre la page admin (index.html)
   et la page publique (public.html).

   Persistance : localStorage
   Temps réel  : événement `storage` (autres onglets) + BroadcastChannel
   ========================================================= */

const Store = (() => {
  const CLE = 'template-site-v1';

  const canal = ('BroadcastChannel' in window) ? new BroadcastChannel('template-site') : null;
  const abonnes = [];

  const VIDE = { presentation: null, photos: null, maj: 0 };

  function lire() {
    try {
      const brut = localStorage.getItem(CLE);
      if (brut) return { ...VIDE, ...JSON.parse(brut) };
    } catch {
      /* stockage indisponible, ou contenu illisible : on repart du contenu par défaut */
    }
    return { ...VIDE };
  }

  /* Écrit une modification partielle : ecrire({ photos: [...] }) ne touche pas la présentation.
     Retourne { ok, etat, raison } — `ok:false` si le stockage a refusé (quota, mode privé…). */
  function ecrire(modification) {
    const etat = { ...lire(), ...modification, maj: Date.now() };
    try {
      localStorage.setItem(CLE, JSON.stringify(etat));
    } catch (e) {
      const quota = e && (e.name === 'QuotaExceededError' || e.code === 22);
      return { ok: false, etat, raison: quota ? 'quota' : 'stockage' };
    }
    if (canal) canal.postMessage(etat);   // l'onglet émetteur ne se reçoit pas lui-même
    return { ok: true, etat };
  }

  function diffuser(etat) {
    abonnes.forEach(cb => { try { cb(etat); } catch (e) { console.error(e); } });
  }

  /* Prévenu quand l'état change depuis un AUTRE onglet / une autre page. */
  function surChangement(cb) {
    abonnes.push(cb);
  }

  window.addEventListener('storage', e => {
    if (e.key !== CLE && e.key !== null) return;   // key === null : localStorage.clear()
    diffuser(lire());
  });

  if (canal) canal.onmessage = e => diffuser(e.data || lire());

  return { lire, ecrire, surChangement };
})();
