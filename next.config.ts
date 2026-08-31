import type { NextConfig } from "next";

// Domaine des sites clients générés. Lu ici au moment du BUILD (les règles de réécriture sont
// figées dans le manifeste) : la valeur par défaut doit donc rester la bonne en production,
// car le shell SSH du serveur ne voit pas les variables d'environnement de cPanel.
const SITES_DOMAIN = process.env.SITES_DOMAIN || "offreofficielle.fr";

const nextConfig: NextConfig = {
  // Un sous-domaine client (voyage-cacher-loisirel-souccot.offreofficielle.fr) affiche la page
  // publique du site correspondant. La réécriture est faite ICI, par le routeur, et non dans
  // proxy.ts : derrière Passenger, Next croit s'appeler « localhost:3000 » et prendrait une
  // réécriture construite depuis l'URL de la requête pour un renvoi vers un serveur externe.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [
            {
              type: "host",
              value: `(?<siteSlug>[a-z0-9-]+)\\.${SITES_DOMAIN.replace(/\./g, "\\.")}(?::\\d+)?`,
            },
          ],
          destination: "/s/:siteSlug",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // o2switch (CloudLinux) limite le nombre de threads/process par compte.
  // Sans ça, le build spawn ~29 workers et plante en "pthread_create: Resource temporarily unavailable".
  // On force 1 worker pour le build.
  experimental: {
    cpus: 1,
    // Même raison : par défaut Next lance la compilation webpack dans un process séparé,
    // ce qui échoue en "spawn node EAGAIN" quand le compte a atteint sa limite de process.
    // À false, la compilation se fait dans le process principal.
    webpackBuildWorker: false,
    // Les etapes suivantes (verification TypeScript, collecte des pages) lancent des workers.
    // En mode "threads", Next les cree DANS le process courant au lieu de spawner un nouveau
    // process node - seule facon de passer la limite d'o2switch.
    workerThreads: true,
  },
};

export default nextConfig;
