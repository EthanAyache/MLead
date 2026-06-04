import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o2switch (CloudLinux) limite le nombre de threads/process par compte.
  // Sans ça, le build spawn ~29 workers et plante en "pthread_create: Resource temporarily unavailable".
  // On force 1 worker pour le build.
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
