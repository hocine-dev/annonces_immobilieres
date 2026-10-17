
import { randomUUID } from "node:crypto"
import { renderToStaticMarkup } from "react-dom/server"
import { PrismaClient } from "@/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

function createLoggedPrismaClient(connectionString: string) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: [{ emit: "event", level: "query" }],
  })
}

let prisma: ReturnType<typeof createLoggedPrismaClient>
let AnnoncesPage: typeof import("@/app/annonces/page")["default"]

let SearchBarReelle: typeof import("@/components/SearchBar")["SearchBar"]
let NavbarReelle: typeof import("@/components/NavBar")["Navbar"]

const unique = randomUUID()
const auteurId = randomUUID()
const prefix = `SQLTEST-${unique}`
const queries: string[] = []

let auteurCree = false
let annoncesAffichees = 0

// Injecter notre client Prisma instrumenté dans la vraie page.
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return prisma
  },
}))

// Neutraliser les composants visuels seulement.
vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}))

vi.mock("@/components/NavBar", () => ({
  Navbar: () => null,
}))

vi.mock("@/components/Footer", () => ({
  Footer: () => null,
}))

vi.mock("@/components/SearchBar", () => ({
  SearchBar: () => null,
}))

vi.mock("@/components/PropertyList", () => ({
  PropertyList: ({
    properties,
  }: {
    properties: Array<{ titre: string }>
  }) => {
    annoncesAffichees = properties.filter(
      (p) => p.titre.startsWith(prefix),
    ).length

    return null
  },
}))

async function verifierBaseTest() {
  const result = await prisma.$queryRaw<
    { database: string }[]
  >`SELECT current_database() AS database`

  if (result[0]?.database !== "immo_test") {
    throw new Error("Base de test incorrecte.")
  }
}

async function ajouterAnnonces(nombre: number) {
  const annonces = Array.from(
    { length: nombre },
    (_, index) => ({
      id: randomUUID(),
      titre: `${prefix} - Bien ${index + 1}`,
      description:
        "Annonce temporaire pour mesurer les requêtes SQL.",
      type: "VENTE" as const,
      typePropriete: "APPARTEMENT" as const,
      statut: "PUBLIE" as const,
      etat: "DISPONIBLE" as const,
      prix: 250000,
      dateDisponibilite: new Date("2026-11-01"),
      ville: "Paris",
      surface: 75,
      chambres: 2,
      auteurId,
    }),
  )

  await prisma.annonce.createMany({
    data: annonces,
  })

  // Une photo par annonce pour tester la relation.
  await prisma.photo.createMany({
    data: annonces.map((annonce) => ({
      annonceId: annonce.id,
      url: "/images/prop-maison.jpg",
    })),
  })
}

async function mesurerPage() {
  queries.length = 0
  annoncesAffichees = 0

  const page = await AnnoncesPage({
    searchParams: Promise.resolve({}),
  })

  renderToStaticMarkup(page)

  // Exécuter les véritables composants serveur.
  // Ils sont neutralisés uniquement pendant le rendu React.
  await SearchBarReelle({ defaultValues: {} })
  await NavbarReelle()

  const sql = queries.filter((query) =>
    /^\s*SELECT\b/i.test(query),
  )

  return {
    requetes: sql.length,
    annonces: annoncesAffichees,
    sql,
  }
}

describe("Performance SQL - /annonces", () => {
  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL

    if (
      !connectionString ||
      new URL(connectionString).pathname !== "/immo_test"
    ) {
      throw new Error("DATABASE_URL doit cibler immo_test.")
    }

    prisma = createLoggedPrismaClient(connectionString)

    prisma.$on("query", (event) => {
      queries.push(event.query)
    })

    await verifierBaseTest()

    await prisma.user.create({
      data: {
        id: auteurId,
        name: "Agent SQL Test",
        email: `sql-${unique}@example.test`,
        role: "AGENT",
      },
    })

    auteurCree = true

    // Import après initialisation du client instrumenté.
    const module = await import("@/app/annonces/page")
    AnnoncesPage = module.default

    const searchModule = await vi.importActual<
      typeof import("@/components/SearchBar")
    >("@/components/SearchBar")

    SearchBarReelle = searchModule.SearchBar

    const navbarModule = await vi.importActual<
      typeof import("@/components/NavBar")
    >("@/components/NavBar")

    NavbarReelle = navbarModule.Navbar
  })

  afterAll(async () => {
    if (!prisma) return

    try {
      if (auteurCree) {
        await verifierBaseTest()

        await prisma.user.deleteMany({
          where: { id: auteurId },
        })
      }
    } finally {
      await prisma.$disconnect()
    }
  })

  it("conserve le même nombre de requêtes avec 3 et 30 annonces", async () => {
    await ajouterAnnonces(3)

    const petit = await mesurerPage()

    await ajouterAnnonces(27)

    const grand = await mesurerPage()

    console.log("===== MESURE SQL /annonces =====")
    console.log("3 annonces :", petit.requetes, "requêtes")
    console.log("30 annonces :", grand.requetes, "requêtes")

    expect(petit.annonces).toBe(3)
    expect(grand.annonces).toBe(30)

    // Invariance : aucune requête supplémentaire par annonce.
    expect(grand.requetes).toBe(petit.requetes)

    // Budget de l'énoncé : 2 + 1 relation incluse.
    expect(grand.requetes).toBeGreaterThan(0)
    expect(grand.requetes).toBeLessThanOrEqual(3)
  })
})
