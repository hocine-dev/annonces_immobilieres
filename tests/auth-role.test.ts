
import { randomUUID } from "node:crypto"
import { afterAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/prisma"

async function verifierBaseTest() {
  const result = await prisma.$queryRaw<
    { database: string }[]
  >`SELECT current_database() AS database`

  if (result[0]?.database !== "immo_test") {
    throw new Error(
      "Test interrompu : la base utilisée n'est pas immo_test.",
    )
  }
}

describe("Sécurité de l'inscription - Rôles", () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it.each(["ADMIN", "AGENT"] as const)(
    "empêche de s'inscrire avec le rôle %s",
    async (roleDemande) => {
      await verifierBaseTest()

      const email =
        `role-${roleDemande.toLowerCase()}-${randomUUID()}@example.test`

      const { auth } = await import("@/lib/auth")

      try {
        const request = new Request(
          "http://localhost:3000/api/auth/sign-up/email",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
            },
            body: JSON.stringify({
              name: "Utilisateur de test",
              email,
              password: "MotDePasseTest123!",
              role: roleDemande,
            }),
          },
        )

        const response = await auth.handler(request)

        expect(
          response.ok,
          `Inscription refusée : HTTP ${response.status}`,
        ).toBe(true)

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            role: true,
          },
        })

        expect(user).not.toBeNull()

        // Le rôle envoyé doit être ignoré.
        expect(user?.role).toBe("USER")
        expect(user?.role).not.toBe(roleDemande)
      } finally {
        await verifierBaseTest()

        // Supprimer uniquement le compte temporaire.
        await prisma.user.deleteMany({
          where: { email },
        })
      }
    },
  )
})
