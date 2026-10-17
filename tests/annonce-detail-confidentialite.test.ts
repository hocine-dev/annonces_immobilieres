
import { randomUUID } from "node:crypto"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}))

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404")
  },
}))

// Neutraliser les composants visuels uniquement
vi.mock("@/components/NavBar", () => ({
  Navbar: () => null,
}))

vi.mock("@/components/Footer", () => ({
  Footer: () => null,
}))

vi.mock("@/components/annonces/QuestionForm", () => ({
  QuestionForm: () => null,
}))

vi.mock("@/components/annonces/FavoriteToggleForm", () => ({
  FavoriteToggleForm: () => null,
}))

vi.mock("next/image", () => ({
  default: () => null,
}))

vi.mock("next/link", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}))

import { prisma } from "@/lib/prisma"
import AnnonceDetailPage from "@/app/annonces/[id]/page"

const suffixe = randomUUID()
const auteurId = randomUUID()
const brouillonId = randomUUID()
const publicationId = randomUUID()

const titreBrouillon = `Brouillon test ${suffixe}`
const titrePublication = `Publication test ${suffixe}`

let auteurCree = false

async function verifierBaseTest() {
  const result = await prisma.$queryRaw<
    { database: string }[]
  >`SELECT current_database() AS database`

  if (result[0]?.database !== "immo_test") {
    throw new Error(
      "Opération interdite hors de la base immo_test",
    )
  }
}

function connecter(id: string, role: string) {
  mocks.getSession.mockResolvedValue({
    user: { id, role },
  })
}

function ouvrirAnnonce(id: string) {
  return AnnonceDetailPage({
    params: Promise.resolve({ id }),
  })
}

describe("Confidentialité des détails d'annonces", () => {
  beforeAll(async () => {
    await verifierBaseTest()

    await prisma.user.create({
      data: {
        id: auteurId,
        name: "Agent de test",
        email: `detail-${suffixe}@example.test`,
        role: "AGENT",
      },
    })

    auteurCree = true

    const base = {
      description:
        "Annonce temporaire pour tester la confidentialité.",
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

    await prisma.annonce.createMany({
      data: [
        {
          ...base,
          id: brouillonId,
          titre: titreBrouillon,
          statut: "BROUILLON",
        },
        {
          ...base,
          id: publicationId,
          titre: titrePublication,
          statut: "PUBLIE",
        },
      ],
    })
  })

  afterAll(async () => {
    try {
      if (auteurCree) {
        await verifierBaseTest()

        // Les annonces sont supprimées par cascade.
        await prisma.user.deleteMany({
          where: { id: auteurId },
        })
      }
    } finally {
      await prisma.$disconnect()
    }
  })

  beforeEach(() => {
    mocks.getSession.mockReset()
    mocks.getSession.mockResolvedValue(null)
  })

  const accesRefuses = [
    {
      profil: "un visiteur",
      session: null,
    },
    {
      profil: "un utilisateur USER",
      session: {
        user: { id: "user-test", role: "USER" },
      },
    },
    {
      profil: "un agent non propriétaire",
      session: {
        user: { id: "agent-b", role: "AGENT" },
      },
    },
  ]

  it.each(accesRefuses)(
    "refuse le brouillon à $profil",
    async ({ session }) => {
      mocks.getSession.mockResolvedValue(session)

      await expect(
        ouvrirAnnonce(brouillonId),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404")
    },
  )

  it("autorise l'agent propriétaire", async () => {
    connecter(auteurId, "AGENT")

    const page = await ouvrirAnnonce(brouillonId)
    const html = renderToStaticMarkup(page)

    expect(html).toContain(titreBrouillon)
  })

  it("autorise un administrateur", async () => {
    connecter("admin-test", "ADMIN")

    const page = await ouvrirAnnonce(brouillonId)
    const html = renderToStaticMarkup(page)

    expect(html).toContain(titreBrouillon)
  })

  it("autorise un visiteur sur une annonce publiée", async () => {
    const page = await ouvrirAnnonce(publicationId)
    const html = renderToStaticMarkup(page)

    expect(html).toContain(titrePublication)
  })

  it("retourne 404 pour un identifiant inexistant", async () => {
    await expect(
      ouvrirAnnonce(randomUUID()),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404")
  })

  it("retourne 404 pour un identifiant vide", async () => {
    await expect(
      ouvrirAnnonce(""),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404")
  })
})
