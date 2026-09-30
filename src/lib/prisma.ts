import { PrismaClient } from "../generated/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL est manquante dans le fichier .env")
  }

  // Utilisation de l'adaptateur PostgreSQL exigé par le TP (Prisma 7)
  const adapter = new PrismaPg({ connectionString })
  
  return new PrismaClient({ adapter, log: ["query"] })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}