# Amphix

**Plateforme de gestion de bootcamp** — inscriptions, paiements, emploi du temps, cours enregistrés et back-office administratif, pour le Bootcamp Amphix 2026.

Amphix combine trois briques habituellement séparées :

- 🎓 **LMS léger** — calendrier des séances, cours enregistrés (replays Google Meet), professeurs
- 💳 **Suivi financier** — statut de paiement par participant, montants en FCFA, revenus dans le temps
- 🛠️ **Back-office admin** — gestion des participants, du programme, des cours et des professeurs

---

## Sommaire

- [Aperçu fonctionnel](#aperçu-fonctionnel)
- [Stack technique](#stack-technique)
- [Structure des routes](#structure-des-routes)
- [Modèle de données (Supabase)](#modèle-de-données-supabase)
- [Authentification](#authentification)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Migrations SQL](#migrations-sql)
- [PWA](#pwa)
- [Limites connues & sécurité](#limites-connues--sécurité)
- [Roadmap](#roadmap)

---

## Aperçu fonctionnel

### Côté participant (`/dashboard`)

| Onglet | Contenu |
| --- | --- |
| **Calendrier** | Emploi du temps hebdomadaire ; sur mobile, vue continue de jours centrée sur aujourd'hui, navigable au swipe ; sur desktop, grille horaire positionnée précisément au temps réel (ligne "maintenant") |
| **Mes cours** | Cartes vidéo des séances enregistrées (Google Meet / Drive) : titre, date, professeur, lien de replay |
| **Paramètres** | Profil, statut de paiement, changement de mot de passe, lien "mot de passe oublié" (redirige vers WhatsApp), installation de l'app en PWA |

Navigation mobile : barre unique en bas d'écran (pas de menu superposé). Navigation desktop : sidebar fixe.

### Côté administrateur (`/admin`)

| Onglet | Contenu |
| --- | --- |
| **Dashboard** | KPIs réels (participants, FCFA encaissés, payés/non payés, cours, sessions), graphique des revenus filtrable **jour / semaine / mois / année**, répartition par niveau d'études, derniers inscrits |
| **Participants** | Recherche, filtres (niveau, statut de paiement), tri, export CSV, enregistrement manuel du montant payé, réinitialisation de mot de passe |
| **Cours** | CRUD des cours (titre, description, couleur) |
| **Professeurs** | CRUD des professeurs |
| **Programme** | Création des séances (cours × professeur × créneau) |
| **Calendrier** | Vue d'ensemble des séances programmées |
| **Enregistrements** | Ajout des liens de replay Google Meet/Drive, associés à un cours et un professeur |

### Authentification & inscription

- `/inscription` — questionnaire d'inscription (nom, WhatsApp, niveau d'études, etc.)
- `/connexion` — connexion par numéro WhatsApp (avec indicatif pays d'Afrique francophone) + mot de passe

---

## Stack technique

- **[TanStack Start](https://tanstack.com/start)** — framework full-stack React, routage **basé fichiers**
- **React** + **TypeScript**
- **Tailwind CSS** — design system utilitaire (`bg-card`, `text-primary`, `shadow-soft`, `gradient-ocean`, etc.)
- **[Supabase](https://supabase.com)** — base de données Postgres, API REST auto-générée, Row Level Security
- **react-hook-form** + **zod** — formulaires et validation (ex. connexion)
- **PWA** — `manifest.json`, service worker, installation sur mobile/desktop

> Authentification **maison** : pas de Supabase Auth. Voir la section [Authentification](#authentification) ci-dessous.

---

## Structure des routes

TanStack Start utilise le **routage basé fichiers** (`src/routes/`). Chaque fichier `.tsx` de ce dossier est une route. Ne pas créer `src/pages/`, `src/routes/_app/index.tsx`, ni `app/layout.tsx` — ce sont des conventions Next.js / Remix, pas TanStack Start. Le seul layout racine est `src/routes/__root.tsx`.

### Conventions générales

| Fichier | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamique — `$` seul, sans accolades) |
| `posts/{-$category}.tsx` | `/posts/:category?` (segment optionnel) |
| `files/$.tsx` | `/files/*` (splat — lu via le paramètre `_splat`, jamais `*`) |
| `_layout.tsx` | route de layout (rend ses enfants via `<Outlet />`) |
| `__root.tsx` | app shell — englobe toutes les pages ; préserver `<Outlet />` |

`routeTree.gen.ts` est généré automatiquement. Ne pas l'éditer à la main.

### Routes du projet

| Fichier | URL | Rôle |
| --- | --- | --- |
| `index.tsx` | `/` | Page d'accueil / vitrine du bootcamp |
| `inscription.tsx` | `/inscription` | Questionnaire d'inscription participant |
| `connexion.tsx` | `/connexion` | Connexion (WhatsApp + mot de passe) |
| `dashboard.tsx` | `/dashboard` | Espace participant (calendrier, cours, paramètres) |
| `admin.tsx` | `/admin` | Back-office administrateur |

---

## Modèle de données (Supabase)

| Table | Description | Colonnes clés |
| --- | --- | --- |
| `participants` | Inscrits au bootcamp | `nom`, `prenoms`, `whatsapp`, `niveau_etudes`, `password_hash`, `paye`, `montant_paye`, `date_paiement` |
| `cours` | Catalogue des cours | `titre`, `description`, `couleur` |
| `professeurs` | Intervenants | `nom`, `prenoms`, `specialite` |
| `sessions` | Créneaux programmés | `cours_id`, `professeur_id`, `date`, `heure_debut`, `heure_fin`, `salle` (lien de visio) |
| `enregistrements` | Replays des séances | `cours_id`, `professeur_id`, `titre`, `lien`, `date`, `description` |

Toutes les tables ont la **Row Level Security (RLS)** activée. Voir les scripts dans [Migrations SQL](#migrations-sql).

---

## Authentification

Amphix **n'utilise pas Supabase Auth**. La connexion est gérée "maison" :

1. À l'inscription, le mot de passe est haché côté client en `SHA-256(password + sel)` et stocké dans `participants.password_hash`.
2. À la connexion, le même hash est recalculé et comparé côté base (`.eq("password_hash", hash)`).
3. La session est ensuite stockée dans `localStorage` (`amphix_session`), sans JWT Supabase.

**Conséquence importante** : la clé `anon` Supabase étant partagée par tous les visiteurs (participants comme admin), les policies RLS ne peuvent pas s'appuyer sur `auth.uid()` pour restreindre un `UPDATE` à "sa propre ligne". La sécurité repose donc sur :
- la vérification applicative avant les appels sensibles (ex. changement de mot de passe),
- le fait que la route `/admin` et la clé `anon` ne sont pas largement diffusées.

À garder en tête si le projet grandit : migrer vers Supabase Auth (ou au minimum un serveur d'API intermédiaire) renforcerait sensiblement ce point.

---

## Installation

```bash
git clone <url-du-repo>
cd amphix
pnpm install   # ou npm install / yarn install

cp .env.example .env
# renseigner les variables Supabase (voir ci-dessous)

pnpm dev       # démarre le serveur de développement
```

> Adapter les commandes au gestionnaire de paquets réellement utilisé dans le projet (`pnpm` / `npm` / `yarn`) et vérifier les scripts exacts dans `package.json`.

---

## Variables d'environnement dans le .env

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique (anon) Supabase |

> Noms exacts à confirmer selon la configuration de `src/lib/supabase.ts` — à ajuster si le projet utilise un autre préfixe (`PUBLIC_`, `NEXT_PUBLIC_`, etc.).

---

## Migrations SQL

À exécuter dans l'éditeur SQL de Supabase, **dans cet ordre**, pour un projet initialisé from scratch :

1. **Tables principales** (`participants`, `cours`, `professeurs`, `sessions`) — schéma de base du projet.
2. `enregistrements.sql` — table des cours enregistrés (replays).
3. `participants_password_policy.sql` — policy RLS autorisant la mise à jour du mot de passe.
4. `add_date_paiement.sql` — colonne `date_paiement`, nécessaire au suivi des revenus dans le temps.
5. `fix_remove_lock_trigger.sql` — retire le trigger de verrouillage devenu incompatible avec l'enregistrement manuel des paiements.

> Ces scripts documentent l'historique des évolutions de la base. Pour un nouveau déploiement, il est plus propre de les consolider en une seule migration cohérente plutôt que de les rejouer un par un.

---

## PWA

L'application est installable (mobile et desktop) :
- `manifest.json` + icônes (`/icon-192x192.png`, etc.)
- Service worker enregistré au chargement du dashboard
- Prompt d'installation natif + guide manuel pour iOS/Safari (qui ne supporte pas `beforeinstallprompt`)

---

## Limites connues & sécurité

- Pas de Supabase Auth — voir [Authentification](#authentification).
- Le hachage de mot de passe est fait **côté client** (`Web Crypto API`) ; c'est correct pour ne jamais faire transiter le mot de passe en clair, mais ne remplace pas un vrai système d'auth serveur avec limitation de tentatives (rate limiting), qui n'existe pas actuellement.
- Le montant payé est saisi **manuellement** par l'admin (pas d'intégration avec un fournisseur de paiement type Mobile Money / Stripe) — donc pas de rapprochement automatique, à surveiller si le volume grandit.
- Le calcul des revenus par période s'appuie sur `date_paiement` ; pour les paiements enregistrés avant l'ajout de cette colonne, `created_at` est utilisé en repli (approximation).

## Roadmap

Idées d'évolutions possibles (non planifiées) :

- [ ] Intégration d'un vrai fournisseur de paiement Mobile Money (relevé automatique, plus de saisie manuelle)
- [ ] Migration vers Supabase Auth pour une sécurité RLS fine, par utilisateur
- [ ] Notifications automatiques (rappel de séance, relance de paiement) via WhatsApp Business API
- [ ] Export des statistiques du dashboard admin en PDF/Excel