# Mr.Lead — Espace de facturation

Application web de gestion commerciale et de facturation pour **Mr.Lead** (revente de leads).
Elle permet de suivre qui doit quoi à qui (clients, brands, apporteurs d'affaires), d'émettre
des factures, d'encaisser les clients via Stripe, et de garder un historique des paiements.

> Projet réalisé dans le cadre d'un stage (BTS SIO).

## Stack technique

- **Next.js 16** (App Router, build Webpack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Prisma 6** + **MySQL** (hébergé chez o2switch)
- **NextAuth v5 (Auth.js)** — authentification e-mail / mot de passe (`Credentials`), mots de passe hachés avec **bcrypt**, sessions JWT, rôles `ADMIN` / `USER`
- **Stripe** — facturation et encaissement des clients (mode test), mise à jour automatique via webhook

## Fonctionnalités

- **Authentification**
  - Inscription / connexion (le **premier compte créé devient ADMIN**)
  - Protection des routes via `proxy.ts` (le « middleware » renommé dans Next.js 16)
  - Espace **admin** : création d'utilisateurs, changement de rôle, **réinitialisation de mot de passe**
- **Dashboard**
  - KPIs (total dû, encaissé du mois, retards, leads, clients actifs)
  - Onglets : Factures impayées · Clients · Brands · Apporteurs d'affaires · Historique
  - Vue **Archives**
- **Factures**
  - Débiteur et créditeur **génériques** : chaque côté peut être un **Client**, une **Brand** ou un **Apporteur**, **Mr.Lead** étant géré comme une brand interne
  - Si le débiteur est un **client**, une **facture Stripe** est créée et envoyée automatiquement
  - **Encaissement automatique** : le webhook Stripe `invoice.paid` passe la facture en « Payée »
  - Décaissements (ce que Mr.Lead doit) : marquage **manuel** via le bouton « Payée »
- **Gestion** des clients, brands, apporteurs et leads (marges achat / vente)

## Modèle de données (Prisma)

`User`, `Account`, `Session`, `VerificationToken` (NextAuth), `Brand`, `Client`, `Apporteur`,
`Lead`, `Invoice`, `Payment`, `Commission`.

## Développement local

```bash
npm install
npx prisma generate
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).
Une base MySQL accessible est nécessaire pour le runtime (voir `DATABASE_URL`).

### Variables d'environnement (`.env`)

```env
DATABASE_URL="mysql://user:motdepasse@host:3306/base"
AUTH_SECRET="..."
AUTH_TRUST_HOST=true
AUTH_URL="https://monsieurlead.jboost.fr"
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

> Les caractères spéciaux du mot de passe MySQL doivent être encodés (ex. `+` → `%2B`).

## Build & déploiement (o2switch)

L'app est déployée sur o2switch (CloudLinux + Passenger). Le build utilise **Webpack** et
**1 worker** (`experimental.cpus = 1` dans `next.config.ts`) car Turbopack ne supporte pas le
lien symbolique `node_modules` du venv et le nombre de threads est limité.

Procédure de déploiement (en SSH, après un `git push`) :

```bash
source /home/<user>/nodevenv/<app>/24/bin/activate   # activer l'environnement Node
cd /home/<user>/<app>
git fetch origin && git reset --hard origin/main      # .env / .htaccess / app.js ne sont pas suivis par git
npm install --include=dev                             # outils de build (NODE_ENV=production sinon les exclut)
npx prisma generate
npx prisma db push                                    # si le schéma a changé
npm run build
touch tmp/restart.txt                                 # redémarrer l'app
```

> Sur o2switch, les variables d'environnement de production sont gérées dans
> **cPanel → Setup Node.js App → Environment variables** (elles ont la priorité sur le `.env`).
> Le webhook Stripe nécessite un certificat SSL valide (Let's Encrypt / AutoSSL) sur le domaine.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (`next build --webpack`) |
| `npm run start` | Démarrage du build de production |
| `npm run lint` | ESLint |
