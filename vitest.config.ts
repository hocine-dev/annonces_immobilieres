
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parse } from "dotenv"
import { defineConfig } from "vitest/config"

// Charger les deux URL depuis .env
const env = parse(readFileSync(".env"))

if (!env.DATABASE_URL || !env.DATABASE_URL_TEST) {
  throw new Error(
    "DATABASE_URL et DATABASE_URL_TEST sont obligatoires.",
  )
}

const dev = new URL(env.DATABASE_URL)
const test = new URL(env.DATABASE_URL_TEST)

// Empêcher l'utilisation de la base de développement
if (
  dev.pathname !== "/immo" ||
  test.pathname !== "/immo_test" ||
  dev.host !== test.host
) {
  throw new Error(
    "Configuration des bases invalide : tests interdits.",
  )
}

// Le client Prisma utilisera exclusivement immo_test
process.env.DATABASE_URL = env.DATABASE_URL_TEST
process.env.DATABASE_URL_TEST = env.DATABASE_URL_TEST

export default defineConfig({
  resolve: {
    alias: { "@": resolve(process.cwd(), "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 15000,
  },
})
