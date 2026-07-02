# Réponse à l'audit de sécurité — MonsieurLead (mlead)

**Date :** 2026-07-02
**Objet :** validation de l'audit, tri *vrai problème* / *voulu*, ordre de correction.

---

## Verdict global

Audit **sérieux et globalement juste**. Vérification faite sur les 2 points les plus graves : `invoices/[id]` et `clients/[id]` ont bien **zéro authentification** (aucun `getCurrentUser`) → **C1 est confirmé et prioritaire**. Le cœur du risque est **le contrôle d'accès** ; la facturation a 2 vrais défauts (C2, I3). Le reste est du durcissement légitime, avec **3 points réellement *voulus*** justifiés plus bas.

| Verdict | Sens | Concernés |
|---|---|---|
| 🟥 **Confirmé** | vrai problème, à corriger | C1, C2, I1, I2, I3, I4, I6, M9(doc) |
| 🟨 **Nuancé** | réel mais surévalué / mitigé | C3 |
| 🟩 **Voulu** | choix de conception assumé | `?token=` ingest · self-register (bootstrap) · `?secret=` cron |
| ⬜ **Mineur** | valide, non urgent | M1–M8 |

---

## 🔴 Critique

| Réf | Verdict | Justification |
|---|---|---|
| **C1a** — routes sans auth (`invoices/[id]`, `clients/[id]`, `brands/[id]`, `apporteurs/[id]`) | 🟥 **Confirmé (le pire)** | Vérifié : `invoices/[id]` (DELETE facture + paiements, PATCH mark_paid) et `clients/[id]` (PII, modif, archive) n'ont **aucune** vérif de session. Exploitable **sans être connecté**. |
| **C1b** — IDOR (`dossiers/[id]`, `themes/[id]`, `campagnes/[id]`) | 🟥 **Confirmé** | Auth OK mais **pas de vérif de propriété**. `dossiers/[id]` = le plus grave : changer `notifyEmails` d'un site tiers **détourne ses leads**. |
| **C1c** — création sans vérif du parent | 🟥 **Confirmé** | `campagnes`, `dossiers`, `leads`, `prospects` (POST) ne valident pas le parent. |
| **C2** — double facturation Stripe | 🟥 **Confirmé** | Fenêtre étroite mais **argent** : une facture `FAILED` **après** un `finalize` réussi est **supprimée** au run suivant → **2ᵉ facture Stripe** sur les mêmes leads. |
| **C3** — race condition | 🟨 **Nuancé** | **Fortement mitigé** par `@@unique([clientId, period])` : 2 runs simultanés sur le même mois → le 2ᵉ prend une violation de contrainte, **pas de 2ᵉ facture**. Reste une micro-fenêtre (delete d'un `DRAFT` concurrent), proba très faible (cron 1×/mois + manuel rare). À durcir un jour, **pas urgent**. |

> **Cause de C1 :** dette connue. Ces routes datent d'**avant le pivot** vers les leads. Les routes récentes (`offers/[id]`, `inbound-leads/[id]`, `monthly-invoices/[id]`, `/api/search`, `/api/inbound-leads`) ont **déjà** le bon modèle `getCurrentUser` + `visibilityFilter` → **il suffit de le répliquer**.
>
> **Correctif C2 :** lier les leads **avant** `finalize`, et **void** la facture Stripe avant de supprimer une `FAILED`.

---

## 🟠 Important

| Réf | Verdict | Justification / correctif |
|---|---|---|
| **I1** — hash bcrypt renvoyé (API admin) | 🟥 **Confirmé** | `select` explicite sans `password`. Correction triviale. |
| **I2** — leads jamais renvoyés après paiement | 🟥 **Confirmé** | Le bandeau promet « transmis dès régularisation » mais **rien ne le fait**. → implémenter le renvoi dans `invoice.paid`, **ou** changer le texte. |
| **I3** — blocage sur `FAILED` | 🟥 **Confirmé (non défendu)** | Bloquer un client parce que **notre** appel Stripe a planté = le punir pour notre panne. → bloquer uniquement sur `SENT`. |
| **I4** — formulaires qui avalent les erreurs | 🟥 **Confirmé (partiel)** | Vrai pour les **anciens** forms (Client/Brand/Apporteur/Invoice). ⚠️ **Faux positif** si ça vise `AddLeadModal` : elle gère déjà `res.ok` + erreur + alerte doublon. |
| **I5** — inscription ouverte | 🟩 **Voulu → à refermer** | Voulu **à l'amorçage** (« 1er compte = ADMIN »). Mais oui : maintenant l'admin crée les comptes → **désactiver le self-register**. Surtout : ouvert + C1 = surface d'attaque. |
| **I6** — email non normalisé | 🟥 **Confirmé (mineur)** | `trim().toLowerCase()` au login + register. |

---

## 🟡 Mineur

| Réf | Verdict | Note |
|---|---|---|
| M1 — montants en `Float` | ⬜ | Vrai pour du billing, mais **sans impact aux montants actuels**. Centimes `Int`/`Decimal` = amélioration future. |
| M2 / M3 — duplication front / regex email | ⬜ | Factorisation légitime (`<Modal>`, `<DataTable>`, `lib/validation`). Non urgent. |
| M4 — 404 vs 500 sur `id` inexistant | ⬜ | Confort. |
| M5 — secrets en query string | 🟩 **Voulu** | `?token=` = **by design** ; `?secret=` cron = pragmatique (voir plus bas). |
| M6 — comparaison non constant-time | ⬜ | Timing-attack sur secret via HTTP = irréaliste. Luxe. |
| M7 — accessibilité modales | ⬜ | `role="dialog"`, Échap, focus-trap : valable, plus tard. |
| M8 — dates initiales UTC | ⬜ | Réel mineur. NB : mes **filtres de dates récents utilisent déjà `localYMD`** pour éviter ce décalage. |
| **M9** — doc `lib/mail.ts` dit « o2switch » | 🟥 **Confirmé (doc)** | **Faux aujourd'hui** : migration vers **Gmail SMTP**, le commentaire n'a pas suivi. À corriger. bcrypt 10→12 = durcissement ok ; `escapeHtml` sur `'` = **aucun impact** (templates en doubles quotes). |

---

## 🟩 Ce qui est *voulu* (et pourquoi)

- **`?token=` dans l'URL de l'ingest** — **API publique** appelée par les formulaires des sites clients. Le token est une **clé d'API par site**, dans l'URL, comme les webhooks / clés d'API classiques. Le passer en header **casserait l'intégration simple** côté client. Garde-fous : token **128 bits crypto**, **par site**, **régénérable en 1 clic** (invalide l'ancien). Ce n'est pas une fuite, c'est le mécanisme d'identification prévu et documenté.
- **Self-register (I5)** — voulu **pour créer le premier admin**. À **refermer** maintenant que l'app tourne (l'admin gère les comptes).
- **`?secret=` du cron** — le cron o2switch est un simple `curl` ; un header serait plus propre mais le risque est faible. Améliorable, non bloquant.

---

## ✅ Points corrects confirmés

Webhook Stripe signé (`constructEvent`, body brut, `runtime='nodejs'`) · ingest public (validation/clamp/honeypot/dédup/échec e-mail non bloquant) · `lib/prisma` singleton · `lib/token` 128 bits · login `bcrypt.compare` + retour uniforme · secrets 100 % en env, aucun `.env` versionné · ownership **correct** sur les routes récentes.

---

## Ordre de correction retenu

1. **C1** — sécuriser toutes les routes `[id]` (modèle `getCurrentUser` + `visibilityFilter` déjà en place ailleurs). *Priorité : `dossiers/[id]`, `invoices/[id]`.*
2. **C2 + I3** — ordre de liaison des leads / void Stripe, et blocage sur `SENT` seulement.
3. **I1 · I2 · I4 · I6 · I5** — durcissement (hash, leads retenus, formulaires, email, fermeture du self-register).
4. **M1 → M9** — propreté (dont le commentaire `mail.ts` → Gmail).

> **Reco :** attaquer **C1 d'abord** — seul point « à corriger sans attendre », et le plus rapide (réplication d'un modèle existant).
