import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx ./prisma/seed.ts", // C'est ici que Prisma 7 va chercher la commande
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});