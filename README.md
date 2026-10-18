# Horizon Immo — Projet Annonces Immo

Projet réalisé en binôme dans le cadre du TP **Frameworks côté serveur** du Master 2 IWOCS, Université Le Havre Normandie.

## Présentation

**Horizon Immo** est une application web de gestion d'annonces immobilières (vente et location). Elle permet de rechercher et consulter des biens, leurs caractéristiques, leurs photos et les questions/réponses associées.

L'application distingue trois rôles :

- **USER** : consulter les annonces publiées, ajouter des favoris et poser des questions ;
- **AGENT** : créer, modifier, publier ou dépublier ses propres annonces, gérer leurs photos et répondre aux questions ;
- **ADMIN** : administrer les utilisateurs et les annonces.

Les accès sont vérifiés côté serveur, en particulier pour les modifications et suppressions d'annonces.

## Technologies

- **Next.js 16** (App Router), **React 19**, **TypeScript** strict et **Tailwind CSS 4** ;
- **PostgreSQL 17** et **Prisma 7** pour la persistance et les migrations ;
- **Better Auth** pour l'authentification et les sessions ;
- **Zod** pour la validation des entrées ;
- **Vitest** pour les tests ;
- **Docker et Docker Compose** pour PostgreSQL et le déploiement.

## 1. Démarrage en développement (depuis un clone neuf)

**Prérequis :** Node.js **22**, npm, Docker avec Docker Compose v2.

```bash
git clone https://www-apps.univ-lehavre.fr/forge/hh243545/annonces_immobilieres.git
cd annonces_immobilieres
bash installer-dev.sh
```

**Le script réalise automatiquement** les opérations suivantes :

1. Vérifie les prérequis et installe les dépendances avec `npm ci`.
2. Crée un fichier `.env` local avec les variables et secrets nécessaires **s'il n'existe pas** ; sinon, conserve la configuration existante et complète, si nécessaire, les variables manquantes.
3. Démarre PostgreSQL 17 avec le `docker-compose.yml` **à la racine** et attend que la base soit accessible.
4. Génère le client Prisma, applique les migrations sur les bases de développement et de test (`immo` et `immo_test`).
5. Exécute le seed pour préparer les comptes et annonces de démonstration.
6. Lance **`npm run dev`** dans le terminal courant.

Ouvrir ensuite **http://localhost:3000**. Le terminal doit rester ouvert pendant le développement ; `Ctrl+C` arrête Next.js mais ne supprime pas les données PostgreSQL.

**Comptes de démonstration :** 1 **ADMIN**, 2 **AGENT** distincts et 2 **USER**, ainsi que 12 annonces réparties entre les agents. Les adresses et mots de passe se trouvent dans les variables `SEED_ADMIN_*`, `SEED_AGENT_*` et `SEED_USER_*` du `.env` local. Les mots de passe ne sont pas publiés sur Git.

Le script peut être relancé : il conserve un `.env` existant. Si la base contient des données personnelles, effectuez une sauvegarde avant de réexécuter le seed. Le port **3000 doit être libre** au moment du lancement.

### Commandes utiles en développement

```bash
npm run dev       # Serveur Next.js (si les dépendances et la base sont prêtes)
npm run build     # Compilation de production
npm run start     # Démarrage après compilation
npm test          # Tests Vitest sur la base de test séparée
npm run db:seed   # Initialisation des données de démonstration
```

Le fichier `.env.example` documente les variables de configuration. **Ne jamais committer `.env` ni les secrets.**

## 2. Déploiement avec l'image Docker Hub

Cette méthode ne nécessite **ni Node.js, ni npm, ni Prisma, ni le code source** sur la machine cible. Seuls **Docker et Docker Compose v2** sont requis.

Image publiée : **[`hocineh/horizon-immo:1.0.0`](https://hub.docker.com/r/hocineh/horizon-immo)**.

### Préparer les deux fichiers

Dans un même dossier, placer :

1. **`docker-compose.yml`** : utiliser **`deploiement/docker-compose.yml`** du dépôt (et non le `docker-compose.yml` de la racine, qui ne lance que PostgreSQL pour le développement).
2. **`.env`** : créer localement le fichier de configuration suivant, en **remplaçant tous les mots de passe et le secret** par des valeurs personnelles suffisamment longues et aléatoires :

```dotenv
# Image applicative publiée sur Docker Hub
HORIZON_IMAGE=hocineh/horizon-immo:1.0.0
APP_PORT=3000

# PostgreSQL (réseau Docker interne)
POSTGRES_USER=immo
POSTGRES_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_POSTGRES_FORT
POSTGRES_DB=immo

# Authentification
BETTER_AUTH_SECRET=REMPLACER_PAR_UN_SECRET_ALEATOIRE_LONG
BETTER_AUTH_URL=http://localhost:3000

# Comptes de démonstration (mots de passe d'au moins 12 caractères)
SEED_ADMIN_EMAIL=admin@example.test
SEED_ADMIN_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_ADMIN_FORT

SEED_AGENT_1_EMAIL=agent1@example.test
SEED_AGENT_1_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_AGENT_1_FORT
SEED_AGENT_2_EMAIL=agent2@example.test
SEED_AGENT_2_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_AGENT_2_FORT

SEED_USER_1_EMAIL=user1@example.test
SEED_USER_1_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_USER_1_FORT
SEED_USER_2_EMAIL=user2@example.test
SEED_USER_2_PASSWORD=REMPLACER_PAR_UN_MOT_DE_PASSE_USER_2_FORT
```

`BETTER_AUTH_SECRET` peut, par exemple, être généré avec `openssl rand -hex 32` sur une machine disposant d'OpenSSL. Le `.env` contient des secrets : **il ne doit pas être ajouté au dépôt**.

### Lancer l'application

Depuis le dossier qui contient ces deux fichiers :

```bash
docker compose up -d --wait
```

Docker récupère l'image **Horizon Immo 1.0.0** et **PostgreSQL 17**, crée les volumes nécessaires, attend PostgreSQL, applique automatiquement les **migrations Prisma**, initialise les comptes et annonces de démonstration, puis lance **Next.js en production**.

Ouvrir **http://localhost:3000** après le démarrage. Si `APP_PORT` est modifié, adapter également `BETTER_AUTH_URL` à l'adresse réellement utilisée. Il n'est pas nécessaire d'exécuter `npm ci`, `prisma migrate` ou `npm run dev` avec cette méthode.

### Vérification et arrêt

```bash
docker compose ps             # État des conteneurs
docker compose logs -f app    # Journaux de l'application
docker compose down           # Arrêt sans effacer les données
```

Les données PostgreSQL et les photos téléversées sont stockées dans des **volumes Docker persistants**. **Ne pas utiliser `docker compose down -v`** si ces données doivent être conservées.

> **Attention aux deux configurations Compose :** le fichier à la racine du dépôt sert au développement local (PostgreSQL seul) ; celui de `deploiement/` sert à exécuter l'application complète à partir de Docker Hub.

## 3. Choix d'architecture et sécurité

- Pages et lectures de données via **Server Components** ; composants client réservés aux interactions nécessaires.
- **Server Actions** pour les mutations métier, avec vérification de l'authentification, des droits et des entrées validées par Zod.
- Droits contrôlés à partir du **rôle** et de la **propriété de chaque annonce** ; un agent ne peut pas modifier les annonces d'un autre agent.
- Les annonces en brouillon ne sont accessibles qu'à leur auteur et aux administrateurs.
- Les questions sont chargées dans un **Server Component asynchrone** avec **`Suspense`** sur la page de détail d'annonce. En développement, un délai simulé permet d'observer le fallback de chargement.
- Les tests Vitest utilisent **une base PostgreSQL distincte** de celle du développement.

## 4. Tests et vérifications

```bash
npm test
npm run build
```

Le TP vérifie notamment les autorisations et l'absence de faille IDOR, les validations Zod, le rendu HTML côté serveur, les codes de réponse HTTP et le nombre de requêtes SQL effectuées pour la liste des annonces.

La démarche d'utilisation et de vérification critique de l'assistance IA est documentée dans **[`AI.md`](AI.md)**.
