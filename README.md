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

Réception de leads : `Campagne`, `Dossier` (= un **site**, porte le token API + le prix par lead),
`InboundLead`, `MonthlyInvoice`.

## Intégration de l'API de réception de leads

Chaque **site** d'un client possède un **lien API** unique (visible sur sa page, bouton
« Afficher le lien API ») de la forme :

```
https://monsieurlead.jboost.fr/api/ingest?token=ml_xxxxxxxxxxxxxxxx
```

Le formulaire du site continue d'envoyer le lead par e-mail **comme avant**, et **en parallèle**
fait un `POST` vers ce lien. L'appel ne doit **jamais bloquer** le formulaire : si l'API est
indisponible, l'utilisateur voit quand même sa confirmation.

**Champs acceptés** (JSON ou `application/x-www-form-urlencoded`) :
`nom`, `email`, `telephone`, `message`, `source`, et un champ piège anti-robot `website`
(honeypot : s'il est rempli, le lead est ignoré).

**Réponse** : `{ "status": "ok", "statut": "valide" | "doublon" }` (un doublon = même e-mail ou
téléphone déjà reçu sur ce site). Token invalide → `401`.

### Exemple HTML + JavaScript (à coller sur le site client)

```html
<form id="contact-form">
  <input name="nom" placeholder="Nom" required />
  <input name="email" type="email" placeholder="Email" />
  <input name="telephone" placeholder="Téléphone" />
  <textarea name="message" placeholder="Votre demande"></textarea>
  <!-- Honeypot anti-robot : caché, laissé vide par un humain -->
  <input name="website" tabindex="-1" autocomplete="off"
         style="position:absolute;left:-9999px" aria-hidden="true" />
  <button type="submit">Envoyer</button>
</form>

<script>
  const API = "https://monsieurlead.jboost.fr/api/ingest?token=ml_xxxxxxxxxxxxxxxx";
  document.getElementById("contact-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.source = location.hostname; // d'où vient le lead

    // 1) ton envoi habituel (e-mail au client) reste inchangé ici…

    // 2) envoi vers Mr.Lead, sans jamais bloquer le formulaire
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {}); // si l'API tombe, on ignore

    alert("Merci, votre demande a bien été envoyée !");
    e.target.reset();
  });
</script>
```

### Exemple PHP (côté serveur, après l'envoi du mail)

```php
<?php
// … ton code d'envoi d'e-mail au client (inchangé) …

// Puis on pousse le lead vers Mr.Lead, sans bloquer en cas d'erreur :
$token   = 'ml_xxxxxxxxxxxxxxxx';
$payload = json_encode([
  'nom'       => $_POST['nom']       ?? '',
  'email'     => $_POST['email']     ?? '',
  'telephone' => $_POST['telephone'] ?? '',
  'message'   => $_POST['message']   ?? '',
  'source'    => $_SERVER['HTTP_HOST'] ?? '',
]);

$ch = curl_init("https://monsieurlead.jboost.fr/api/ingest?token=$token");
curl_setopt_array($ch, [
  CURLOPT_POST           => true,
  CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
  CURLOPT_POSTFIELDS     => $payload,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT        => 4,
]);
curl_exec($ch); // on n'interrompt pas le visiteur si ça échoue
curl_close($ch);
```

### Tester rapidement (curl)

```bash
curl -X POST "https://monsieurlead.jboost.fr/api/ingest?token=ml_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"nom":"Jean Test","email":"jean@test.fr","telephone":"0600000000","message":"Devis"}'
# → {"status":"ok","statut":"valide"}
```

Le lead apparaît alors sur la page du site (Client → Campagne → Site).

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
