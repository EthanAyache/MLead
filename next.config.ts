import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
