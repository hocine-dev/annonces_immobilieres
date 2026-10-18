#!/usr/bin/env bash
# Horizon Immo - Installation du projet pour un environnement de developpement local.
# Utilisation : bash installer-dev.sh
# Prerequis : Node.js >= 20.9, npm, Docker Engine et Docker Compose v2.
set -Eeuo pipefail

fail() { printf '\n[ERREUR] %s\n' "$*" >&2; exit 1; }
step() { printf '\n===== %s =====\n' "$*"; }
trap 'printf "\n[ERREUR] Installation interrompue à la ligne %s (code %s).\n" "$LINENO" "$?" >&2' ERR

# Fonctionne quel que soit le repertoire depuis lequel le script est appele.
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

[[ -f package.json && -f prisma/schema.prisma && -f docker-compose.yml ]] || \
  fail 'Placez installer-dev.sh à la racine du dépôt Horizon Immo.'
[[ -f package-lock.json ]] || fail 'package-lock.json est absent ; npm ci ne peut pas être exécuté.'
command -v node >/dev/null || fail 'Node.js manque. Installez Node.js >= 20.9.'
command -v npm >/dev/null || fail 'npm manque. Installez Node.js avec npm.'
command -v docker >/dev/null || fail 'Docker manque. Installez Docker Engine / Docker Desktop.'
docker compose version >/dev/null 2>&1 || fail 'Docker Compose v2 est indisponible.'
docker info >/dev/null 2>&1 || fail 'Docker n’est pas lancé ou votre utilisateur n’a pas les droits Docker.'

node - <<'JS' || fail 'Node.js >= 20.9 est nécessaire pour Next.js 16.'
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 20 || (major === 20 && minor < 9)) process.exit(1)
console.log(`[OK] Node.js ${process.versions.node}`)
JS

echo '[OK] Docker et Docker Compose disponibles.'

# Le professeur n'a pas à écrire ses mots de passe à la main.
# Un .env existant est conservé ; jamais remplacé par celui du script.
step '1/7 - Installation des dépendances npm'
npm ci

step '2/7 - Préparation de .env (local, non versionné)'
node <<'JS'
const fs = require('node:fs')
const crypto = require('node:crypto')
const net = require('node:net')
const { parse } = require('dotenv')

const envPath = '.env'
const random = (bytes = 18) => crypto.randomBytes(bytes).toString('hex')
const accounts = {
  SEED_ADMIN_EMAIL: 'admin@example.test',
  SEED_ADMIN_PASSWORD: random(),
  SEED_AGENT_1_EMAIL: 'agent1@example.test',
  SEED_AGENT_1_PASSWORD: random(),
  SEED_AGENT_2_EMAIL: 'agent2@example.test',
  SEED_AGENT_2_PASSWORD: random(),
  SEED_USER_1_EMAIL: 'user1@example.test',
  SEED_USER_1_PASSWORD: random(),
  SEED_USER_2_EMAIL: 'user2@example.test',
  SEED_USER_2_PASSWORD: random(),
}

function appendMissing(values, current) {
  const missing = Object.entries(values).filter(([key]) => !current[key])
  if (!missing.length) return current
  fs.appendFileSync(envPath, '\n# Valeurs complétées par installer-dev.sh\n' +
    missing.map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { encoding: 'utf8' })
  console.log(`[OK] ${missing.length} variable(s) locale(s) ajoutée(s).`)
  return parse(fs.readFileSync(envPath))
}

async function freePort(start) {
  for (let port = start; port <= start + 20; port++) {
    const free = await new Promise(resolve => {
      const server = net.createServer()
      server.once('error', () => resolve(false))
      server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
    })
    if (free) return port
  }
  throw new Error('Aucun port PostgreSQL libre entre 5432 et 5452.')
}

;(async () => {
  let env
  if (!fs.existsSync(envPath)) {
    const port = await freePort(5432)
    const password = random(24)
    const user = 'immo'
    const db = 'immo'
    const connection = `postgresql://${user}:${password}@localhost:${port}/${db}?schema=public`
    const testConnection = `postgresql://${user}:${password}@localhost:${port}/immo_test?schema=public`
    const generated = {
      POSTGRES_USER: user,
      POSTGRES_PASSWORD: password,
      POSTGRES_DB: db,
      POSTGRES_PORT: String(port),
      DATABASE_URL: connection,
      DATABASE_URL_TEST: testConnection,
      BETTER_AUTH_SECRET: random(32),
      BETTER_AUTH_URL: 'http://localhost:3000',
      ...accounts,
    }
    const text = '# Généré pour un usage local. Ne jamais committer ce fichier.\n' +
      Object.entries(generated).map(([key, value]) => `${key}=${value}`).join('\n') + '\n'
    fs.writeFileSync(envPath, text, { flag: 'wx', mode: 0o600 })
    env = generated
    console.log(`[OK] .env créé (PostgreSQL port ${port}).`)
  } else {
    console.log('[OK] .env déjà présent : paramètres existants conservés.')
    env = parse(fs.readFileSync(envPath))
    // Compatibilité avec les anciennes versions du modèle .env.
    env = appendMissing({
      BETTER_AUTH_URL: 'http://localhost:3000',
      ...accounts,
    }, env)
  }
  const required = [
    'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'POSTGRES_PORT',
    'DATABASE_URL', 'DATABASE_URL_TEST', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL',
    ...Object.keys(accounts),
  ]
  const absent = required.filter(key => !env[key])
  if (absent.length) throw new Error(`Variables manquantes dans .env : ${absent.join(', ')}`)
  const dev = new URL(env.DATABASE_URL)
  const test = new URL(env.DATABASE_URL_TEST)
  const decoded = decodeURIComponent(dev.pathname.slice(1))
  const testDb = decodeURIComponent(test.pathname.slice(1))
  const sameCredentials = decodeURIComponent(dev.username) === env.POSTGRES_USER &&
    decodeURIComponent(dev.password) === env.POSTGRES_PASSWORD
  const serverIsLocal = ['localhost', '127.0.0.1'].includes(dev.hostname)
  const samePort = Number(dev.port || 5432) === Number(env.POSTGRES_PORT)
  if (!serverIsLocal || !samePort || !sameCredentials || decoded !== env.POSTGRES_DB ||
      testDb !== 'immo_test' || test.host !== dev.host ||
      test.username !== dev.username || test.password !== dev.password) {
    throw new Error('Les URLs PostgreSQL ne correspondent pas aux variables POSTGRES_* locales, ou la base test n’est pas immo_test. Vérifiez .env.')
  }
  console.log(`[OK] Développement : ${decoded} ; tests : ${testDb} (bases distinctes).`)
  console.log('[INFO] Les identifiants de démonstration sont enregistrés dans .env.')
})().catch(err => { console.error('[ERREUR] ' + err.message); process.exitCode = 1 })
JS

# Ne pas accepter de serveur déjà actif sur 3000 : le prof doit savoir quel site est ouvert.
step '3/7 - Vérification du port HTTP 3000'
node <<'JS' || fail 'Le port 3000 est déjà utilisé. Arrêtez le serveur concerné et relancez ce script.'
const net = require('node:net')
const server = net.createServer()
server.once('error', () => process.exit(1))
server.listen(3000, '127.0.0.1', () => server.close(() => console.log('[OK] Port 3000 disponible.')))
JS

step '4/7 - Démarrage de PostgreSQL avec Docker'
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d db

# Attend que Postgres soit prêt à accepter les connexions, y compris au premier démarrage.
step '5/7 - Attente de PostgreSQL'
ready=0
for attempt in $(seq 1 60); do
  if docker compose --env-file .env exec -T db sh -c \
       'pg_isready -q -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
[[ "$ready" == 1 ]] || fail 'PostgreSQL ne répond pas. Vérifiez : docker compose logs db'
echo '[OK] PostgreSQL opérationnel.'

step '6/7 - Génération Prisma, migrations et données de démonstration'
npx --no-install prisma generate
npx --no-install prisma migrate deploy

# Prépare également immo_test pour que le professeur puisse exécuter npm test.
# N'efface aucune donnée si la base existe déjà.
docker compose --env-file .env exec -T db sh <<'SH'
set -eu
found=$(psql -U "$POSTGRES_USER" -d postgres -Atc   "SELECT 1 FROM pg_database WHERE datname = 'immo_test'")
if [ "$found" != "1" ]; then
  createdb -U "$POSTGRES_USER" immo_test
  echo '[OK] Base de tests immo_test créée.'
else
  echo '[OK] Base de tests immo_test déjà présente.'
fi
SH

# Prisma 7 lit DATABASE_URL depuis l'environnement et prisma.config.ts.
node <<'JS'
const { readFileSync } = require('node:fs')
const { parse } = require('dotenv')
const { spawnSync } = require('node:child_process')
const config = parse(readFileSync('.env'))
const result = spawnSync('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, ...config, DATABASE_URL: config.DATABASE_URL_TEST },
})
if (result.error) { console.error(result.error); process.exit(1) }
process.exit(result.status ?? 1)
JS


# Better Auth impose une longueur minimale aux nouveaux mots de passe.
# Sur une installation déjà configurée, certains mots de passe du .env
# peuvent être trop courts. Les renouveler sans précaution casserait l'accès
# aux comptes existants : ne corriger automatiquement que les comptes absents.
step '6/7 - Vérification des mots de passe des comptes de démonstration'
node <<'JS'
const fs = require('node:fs')
const crypto = require('node:crypto')
const { Client } = require('pg')
const { parse } = require('dotenv')

const envPath = '.env'
const original = fs.readFileSync(envPath, 'utf8')
const env = parse(original)
const credentials = [
  ['SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'],
  ['SEED_AGENT_1_EMAIL', 'SEED_AGENT_1_PASSWORD'],
  ['SEED_AGENT_2_EMAIL', 'SEED_AGENT_2_PASSWORD'],
  ['SEED_USER_1_EMAIL', 'SEED_USER_1_PASSWORD'],
  ['SEED_USER_2_EMAIL', 'SEED_USER_2_PASSWORD'],
]

async function main() {
  const db = new Client({ connectionString: env.DATABASE_URL })
  await db.connect()
  let present
  try {
    const emails = credentials.map(([emailKey]) => env[emailKey])
    const result = await db.query(
      'SELECT email FROM "user" WHERE email = ANY($1::text[])',
      [emails],
    )
    present = new Set(result.rows.map(row => row.email))
  } finally {
    await db.end()
  }

  let updated = original
  const changed = []
  for (const [emailKey, passwordKey] of credentials) {
    const email = env[emailKey]
    const password = env[passwordKey]
    if (!email || !password) {
      throw new Error(`Variables ${emailKey}/${passwordKey} manquantes.`)
    }
    if (password.length >= 12) continue

    if (present.has(email)) {
      // Mot de passe éventuellement utilisé par l'ancien compte : ne pas le modifier.
      console.log(`[INFO] ${passwordKey} : compte déjà présent ; mot de passe conservé.`)
      continue
    }

    const re = new RegExp(`^([ \\t]*${passwordKey}[ \\t]*=).*$`, 'gm')
    const matches = [...updated.matchAll(re)]
    if (matches.length !== 1) {
      throw new Error(`${passwordKey} apparaît ${matches.length} fois dans .env ; correction automatique impossible.`)
    }
    const secret = crypto.randomBytes(24).toString('hex')
    updated = updated.replace(re, (_line, prefix) => prefix + secret)
    changed.push(passwordKey)
  }

  if (changed.length > 0) {
    const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const backup = `.env.backup-${stamp}`
    fs.copyFileSync(envPath, backup, fs.constants.COPYFILE_EXCL)
    fs.chmodSync(backup, 0o600)
    const tmp = `.env.temp-${process.pid}`
    try {
      fs.writeFileSync(tmp, updated, { mode: 0o600, flag: 'wx' })
      fs.renameSync(tmp, envPath)
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
    }
    console.log(`[OK] ${changed.join(', ')} : nouveau mot de passe sécurisé généré.`)
    console.log(`[OK] Ancien .env sauvegardé dans ${backup} (local, ignoré par Git).`)
  } else {
    console.log('[OK] Aucun nouveau compte avec mot de passe trop court.')
  }
}
main().catch(err => { console.error('[ERREUR] ' + err.message); process.exitCode = 1 })
JS

npm run db:seed

# Le seed du projet initialise les comptes AGENT et USER.
# Complément local : un compte ADMIN de démonstration, avec un secret dans .env.
admin_script=$(mktemp "$PWD/.horizon-init-admin-XXXXXX.ts")
cat > "$admin_script" <<'TS'
import "dotenv/config"
import { auth } from "./src/lib/auth"
import { prisma } from "./src/lib/prisma"

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) throw new Error("SEED_ADMIN_EMAIL/PASSWORD manquants.")
  const account = await prisma.user.findUnique({ where: { email } })
  if (account) {
    if (account.role !== "ADMIN") {
      throw new Error("L'adresse ADMIN existe avec un autre rôle ; vérifiez le compte.")
    }
    console.log("[OK] Compte ADMIN déjà présent.")
    return
  }
  await auth.api.signUpEmail({ body: { name: "Administrateur Horizon", email, password } })
  const created = await prisma.user.findUniqueOrThrow({ where: { email } })
  await prisma.user.update({ where: { id: created.id }, data: { role: "ADMIN" } })
  console.log("[OK] Compte ADMIN de démonstration créé.")
}
main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
TS
if ! npx --no-install tsx "$admin_script"; then
  rm -f -- "$admin_script"
  fail 'Initialisation du compte ADMIN impossible.'
fi
rm -f -- "$admin_script"

step '7/7 - Démarrage de Horizon Immo'
printf '\n[OK] Installation terminée.\n'
printf 'Ouvrez le site : http://localhost:3000\n'
printf 'Comptes de démonstration : consultez SEED_ADMIN_*, SEED_AGENT_* et SEED_USER_* dans .env\n'
printf 'Laissez ce terminal ouvert ; Ctrl+C arrête Next.js (PostgreSQL reste dans Docker).\n\n'
exec npm run dev
