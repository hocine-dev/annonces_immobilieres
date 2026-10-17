
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  annonceFindUnique: vi.fn(),
  annonceUpdate: vi.fn(),
  annonceUpdateMany: vi.fn(),
  photoFindMany: vi.fn(),
  photoDeleteMany: vi.fn(),
  photoCreate: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    annonce: {
      findUnique: mocks.annonceFindUnique,
      update: mocks.annonceUpdate,
      updateMany: mocks.annonceUpdateMany,
    },
    photo: {
      findMany: mocks.photoFindMany,
      deleteMany: mocks.photoDeleteMany,
      create: mocks.photoCreate,
    },
  },
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: () => {
    throw new Error("NOT_FOUND")
  },
}))

vi.mock("fs/promises", () => ({
  writeFile: mocks.writeFile,
  unlink: mocks.unlink,
}))

vi.mock("node:fs/promises", () => ({
  writeFile: mocks.writeFile,
  unlink: mocks.unlink,
}))

import {
  updateAnnonce,
  updateEtatBien,
} from "@/app/agent/details/[id]/actions"

type Role = "USER" | "AGENT" | "ADMIN"

const ANNONCE_A = "annonce-agent-a"

function connecter(id: string, role: Role) {
  mocks.getSession.mockResolvedValue({
    user: { id, role },
  })
}

function formulaireEtat(etat: string) {
  const data = new FormData()
  data.set("etat", etat)
  return data
}

function formulaireEdition(
  modifications: Record<string, string> = {},
) {
  const valeurs = {
    titre: "Appartement lumineux au Havre",
    description:
      "Appartement moderne avec balcon et parking privé.",
    ville: "Le Havre",
    prix: "220000",
    surface: "75",
    chambres: "2",
    type: "VENTE",
    typePropriete: "APPARTEMENT",
    dateDisponibilite: "2026-11-01",
    ...modifications,
  }

  const data = new FormData()

  for (const [cle, valeur] of Object.entries(valeurs)) {
    data.set(cle, valeur)
  }

  return data
}

function nombreModifications() {
  return (
    mocks.annonceUpdate.mock.calls.length +
    mocks.annonceUpdateMany.mock.calls.length
  )
}

function aucuneModification() {
  expect(mocks.annonceUpdate).not.toHaveBeenCalled()
  expect(mocks.annonceUpdateMany).not.toHaveBeenCalled()
  expect(mocks.photoDeleteMany).not.toHaveBeenCalled()
  expect(mocks.photoCreate).not.toHaveBeenCalled()
  expect(mocks.writeFile).not.toHaveBeenCalled()
  expect(mocks.unlink).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.resetAllMocks()

  mocks.getSession.mockResolvedValue(null)

  mocks.annonceFindUnique.mockResolvedValue({
    id: ANNONCE_A,
    auteurId: "agent-a",
    type: "VENTE",
  })

  mocks.annonceUpdate.mockResolvedValue({
    id: ANNONCE_A,
  })

  mocks.annonceUpdateMany.mockResolvedValue({
    count: 1,
  })

  mocks.photoFindMany.mockResolvedValue([])
  mocks.photoDeleteMany.mockResolvedValue({ count: 0 })
  mocks.photoCreate.mockResolvedValue({ id: "photo-test" })
})

const profilsInterdits = [
  {
    profil: "visiteur",
    session: null,
  },
  {
    profil: "USER",
    session: {
      user: { id: "user-a", role: "USER" },
    },
  },
  {
    profil: "AGENT non propriétaire",
    session: {
      user: { id: "agent-b", role: "AGENT" },
    },
  },
]

describe("AGENT - Modification de l'état du bien", () => {
  it.each(profilsInterdits)(
    "refuse un $profil",
    async ({ session }) => {
      mocks.getSession.mockResolvedValue(session)

      await updateEtatBien(
        ANNONCE_A,
        formulaireEtat("VENDU"),
      )

      aucuneModification()
    },
  )

  it("interdit de louer un bien en vente", async () => {
    connecter("agent-a", "AGENT")

    await updateEtatBien(
      ANNONCE_A,
      formulaireEtat("LOUE"),
    )

    aucuneModification()
  })

  it("interdit de vendre un bien en location", async () => {
    connecter("agent-a", "AGENT")

    mocks.annonceFindUnique.mockResolvedValue({
      id: ANNONCE_A,
      auteurId: "agent-a",
      type: "LOCATION",
    })

    await updateEtatBien(
      ANNONCE_A,
      formulaireEtat("VENDU"),
    )

    aucuneModification()
  })

  it("refuse un état inconnu", async () => {
    connecter("agent-a", "AGENT")

    await updateEtatBien(
      ANNONCE_A,
      formulaireEtat("RESERVE"),
    )

    aucuneModification()
  })

  it("refuse un identifiant vide", async () => {
    connecter("agent-a", "AGENT")

    await updateEtatBien(
      "",
      formulaireEtat("VENDU"),
    )

    aucuneModification()
  })

  it("autorise le propriétaire à vendre son bien", async () => {
    connecter("agent-a", "AGENT")

    await updateEtatBien(
      ANNONCE_A,
      formulaireEtat("VENDU"),
    )

    expect(mocks.getSession).toHaveBeenCalled()
    expect(nombreModifications()).toBe(1)
  })

  it("autorise un ADMIN à modifier l'état", async () => {
    connecter("admin-a", "ADMIN")

    await updateEtatBien(
      ANNONCE_A,
      formulaireEtat("DISPONIBLE"),
    )

    expect(mocks.getSession).toHaveBeenCalled()
    expect(nombreModifications()).toBe(1)
  })
})

describe("AGENT - Modification complète de l'annonce", () => {
  it.each(profilsInterdits)(
    "refuse un $profil",
    async ({ session }) => {
      mocks.getSession.mockResolvedValue(session)

      await updateAnnonce(
        ANNONCE_A,
        formulaireEdition(),
      )

      aucuneModification()
    },
  )

  const entreesInvalides: Array<{
    cas: string
    modifications: Record<string, string>
  }> = [
    {
      cas: "prix négatif",
      modifications: { prix: "-500" },
    },
    {
      cas: "titre trop court",
      modifications: { titre: "ABC" },
    },
    {
      cas: "surface négative",
      modifications: { surface: "-12" },
    },
    {
      cas: "chambres vides",
      modifications: { chambres: "" },
    },
    {
      cas: "type de transaction invalide",
      modifications: { type: "ECHANGE" },
    },
    {
      cas: "type de propriété inconnu",
      modifications: { typePropriete: "TERRAIN" },
    },
    {
      cas: "date invalide",
      modifications: {
        dateDisponibilite: "date-invalide",
      },
    },
  ]

  it.each(entreesInvalides)(
    "refuse un $cas",
    async ({ modifications }) => {
      connecter("agent-a", "AGENT")

      await updateAnnonce(
        ANNONCE_A,
        formulaireEdition(modifications),
      )

      aucuneModification()
    },
  )

  it("autorise l'agent propriétaire", async () => {
    connecter("agent-a", "AGENT")

    await updateAnnonce(
      ANNONCE_A,
      formulaireEdition(),
    )

    expect(mocks.getSession).toHaveBeenCalled()
    expect(nombreModifications()).toBe(1)
  })

  it("autorise un ADMIN à modifier une annonce", async () => {
    connecter("admin-a", "ADMIN")

    await updateAnnonce(
      ANNONCE_A,
      formulaireEdition(),
    )

    expect(mocks.getSession).toHaveBeenCalled()
    expect(nombreModifications()).toBe(1)
  })
})
