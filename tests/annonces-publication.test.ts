
import { randomUUID } from "node:crypto"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

// Neutraliser uniquement les composants visuels.
// Les requêtes Prisma des pages restent réelles.
vi.mock("@/components/NavBar", () => ({
  Navbar: () => null,
}))

vi.mock("@/components/Footer", () => ({
  Footer: () => null,
}))

vi.mock("@/components/Hero", () => ({
  Hero: () => null,
}))

vi.mock("@/components/SearchBar", () => ({
  SearchBar: () => null,
}))

vi.mock("@/components/PropertyList", async () => {
  const { createElement } = await import("react")

  return {
    PropertyList: ({
      properties,
    }: {
      properties: Array<{ id: string; titre: string }>
    }) =>
      createElement(
        "section",
        { "data-testid": "annonces" },
        ...properties.map((annonce) =>
          createElement(
            "h2",
            { key: annonce.id },
            annonce.titre,
          ),
        ),
      ),
  }
})

import { prisma } from "@/lib/prisma"
import HomePage from "@/app/page"
import AnnoncesPage from "@/app/annonces/page"

const identifiant = randomUUID()
const auteurId = randomUUID()

const titrePublie = `Test publié ${identifiant}`
const titreBrouillon = `Test brouillon ${identifiant}`

let auteurCree = false

async function verifierBaseTest() {
  const result = await prisma.$queryRaw<
    { database: string }[]
  >`SELECT current_database() AS database`

  if (result[0]?.database !== "immo_test") {
    throw new Error(
      "Test interrompu : connexion hors de immo_test.",
    )
  }
}

describe("Confidentialité des brouillons", () => {
  beforeAll(async () => {
    // Protection AVANT toute écriture.
    await verifierBaseTest()

    await prisma.user.create({
      data: {
        id: auteurId,
        name: "Agent de test",
        email: `test-${identifiant}@example.test`,
        role: "AGENT",
      },
    })

    auteurCree = true

    const annonceBase = {
      description:
        "Annonce fictive réservée aux tests d'intégration.",
      type: "VENTE" as const,
      typePropriete: "APPARTEMENT" as const,
      etat: "DISPONIBLE" as const,
      prix: 250000,
      dateDisponibilite: new Date("2026-11-01"),
      ville: "Paris",
      surface: 75,
      chambres: 2,
      auteurId,
    }

    await prisma.annonce.create({
      data: {
        ...annonceBase,
        titre: titrePublie,
        statut: "PUBLIE",
      },
    })

    await prisma.annonce.create({
      data: {
        ...annonceBase,
        titre: titreBrouillon,
        statut: "BROUILLON",
      },
    })
  })

  afterAll(async () => {
    if (auteurCree) {
      // Supprimer uniquement nos données de test.
      await verifierBaseTest()

      // Les annonces sont supprimées par cascade.
      await prisma.user.delete({
        where: { id: auteurId },
      })
    }

    await prisma.$disconnect()
  })

  it("masque les brouillons sur /annonces", async () => {
    const page = await AnnoncesPage({
      searchParams: Promise.resolve({}),
    })

    const html = renderToStaticMarkup(page)

    expect(html).toContain(titrePublie)
    expect(html).not.toContain(titreBrouillon)
  })

  it("masque les brouillons sur la page d'accueil", async () => {
    const page = await HomePage()

    const html = renderToStaticMarkup(page)

    expect(html).toContain(titrePublie)
    expect(html).not.toContain(titreBrouillon)
  })
})
