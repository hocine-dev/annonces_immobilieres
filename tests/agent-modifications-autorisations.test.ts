import { beforeEach, describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"

// Chaque API externe est simulée : aucun accès à la vraie BDD ni au disque.
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  annonceFindUnique: vi.fn(),
  annonceUpdate: vi.fn(),
  annonceUpdateMany: vi.fn(),
  photoFindMany: vi.fn(),
  photoCount: vi.fn(),
  photoDeleteMany: vi.fn(),
  photoCreate: vi.fn(),
  photoCreateMany: vi.fn(),
  transaction: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}))
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
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
      count: mocks.photoCount,
      deleteMany: mocks.photoDeleteMany,
      create: mocks.photoCreate,
      createMany: mocks.photoCreateMany,
    },
    $transaction: mocks.transaction,
  },
}))
vi.mock("node:fs/promises", () => ({
  writeFile: mocks.writeFile,
  unlink: mocks.unlink,
  mkdir: mocks.mkdir,
  rename: mocks.rename,
}))
vi.mock("fs/promises", () => ({
  writeFile: mocks.writeFile,
  unlink: mocks.unlink,
  mkdir: mocks.mkdir,
  rename: mocks.rename,
}))

import { updateAnnonce, updateEtatBien } from "@/app/agent/annonces/[id]/actions"

type Role = "USER" | "AGENT" | "ADMIN"
const ANNONCE_A = "annonce-agent-a"

function connecter(id: string, role: Role) {
  mocks.getSession.mockResolvedValue({ user: { id, role } })
}

function formulaireEtat(etat: string) {
  const data = new FormData()
  data.set("etat", etat)
  return data
}

function formulaireEdition(modifications: Record<string, string> = {}) {
  const valeurs = {
    titre: "Appartement lumineux au Havre",
    description: "Appartement moderne avec balcon et parking privé.",
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
  for (const [cle, valeur] of Object.entries(valeurs)) data.set(cle, valeur)
  return data
}

function nombreModifications() {
  return mocks.annonceUpdate.mock.calls.length + mocks.annonceUpdateMany.mock.calls.length
}

function aucuneModification() {
  expect(mocks.annonceUpdate).not.toHaveBeenCalled()
  expect(mocks.annonceUpdateMany).not.toHaveBeenCalled()
  expect(mocks.transaction).not.toHaveBeenCalled()
  expect(mocks.photoDeleteMany).not.toHaveBeenCalled()
  expect(mocks.photoCreate).not.toHaveBeenCalled()
  expect(mocks.photoCreateMany).not.toHaveBeenCalled()
  expect(mocks.writeFile).not.toHaveBeenCalled()
  expect(mocks.unlink).not.toHaveBeenCalled()
  expect(mocks.rename).not.toHaveBeenCalled()
  expect(mocks.mkdir).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getSession.mockResolvedValue(null)
  // Next.js interrompt réellement l'exécution via une exception de contrôle.
  mocks.redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  })
  mocks.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND")
  })
  mocks.annonceFindUnique.mockResolvedValue({
    id: ANNONCE_A,
    auteurId: "agent-a",
    type: "VENTE",
  })
  mocks.annonceUpdate.mockResolvedValue({ id: ANNONCE_A })
  mocks.annonceUpdateMany.mockResolvedValue({ count: 1 })
  mocks.photoFindMany.mockResolvedValue([])
  mocks.photoCount.mockResolvedValue(0)
  mocks.photoDeleteMany.mockResolvedValue({ count: 0 })
  mocks.photoCreate.mockResolvedValue({ id: "photo-test" })
  mocks.photoCreateMany.mockResolvedValue({ count: 0 })
  mocks.writeFile.mockResolvedValue(undefined)
  mocks.unlink.mockResolvedValue(undefined)
  mocks.mkdir.mockResolvedValue(undefined)
  mocks.rename.mockResolvedValue(undefined)
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      annonce: { update: mocks.annonceUpdate, updateMany: mocks.annonceUpdateMany },
      photo: {
        deleteMany: mocks.photoDeleteMany,
        createMany: mocks.photoCreateMany,
      },
    }),
  )
})

const profilsInterdits = [
  { profil: "visiteur", session: null, erreur: "NEXT_REDIRECT:/login" },
  { profil: "USER", session: { user: { id: "user-a", role: "USER" } }, erreur: "NEXT_NOT_FOUND" },
  { profil: "AGENT non propriétaire", session: { user: { id: "agent-b", role: "AGENT" } }, erreur: "NEXT_NOT_FOUND" },
]

describe("AGENT - Modification de l'état du bien", () => {
  it.each(profilsInterdits)("refuse un $profil", async ({ session, erreur }) => {
    mocks.getSession.mockResolvedValue(session)
    await expect(updateEtatBien(ANNONCE_A, formulaireEtat("VENDU"))).rejects.toThrow(erreur)
    expect(mocks.getSession).toHaveBeenCalled()
    aucuneModification()
  })

  it("interdit de louer un bien en vente", async () => {
    connecter("agent-a", "AGENT")
    await expect(updateEtatBien(ANNONCE_A, formulaireEtat("LOUE")))
      .rejects.toThrow("État incompatible avec le type de transaction")
    aucuneModification()
  })

  it("interdit de vendre un bien en location", async () => {
    connecter("agent-a", "AGENT")
    mocks.annonceFindUnique.mockResolvedValue({ id: ANNONCE_A, auteurId: "agent-a", type: "LOCATION" })
    await expect(updateEtatBien(ANNONCE_A, formulaireEtat("VENDU")))
      .rejects.toThrow("État incompatible avec le type de transaction")
    aucuneModification()
  })

  it("refuse un état inconnu", async () => {
    connecter("agent-a", "AGENT")
    await expect(updateEtatBien(ANNONCE_A, formulaireEtat("RESERVE")))
      .rejects.toBeInstanceOf(ZodError)
    aucuneModification()
  })

  it("refuse un identifiant vide", async () => {
    connecter("agent-a", "AGENT")
    await expect(updateEtatBien("", formulaireEtat("VENDU")))
      .rejects.toThrow("NEXT_NOT_FOUND")
    aucuneModification()
  })

  it("autorise le propriétaire à vendre son bien", async () => {
    connecter("agent-a", "AGENT")
    await expect(updateEtatBien(ANNONCE_A, formulaireEtat("VENDU")))
      .rejects.toThrow("NEXT_REDIRECT:/agent/annonces/")
    expect(mocks.getSession).toHaveBeenCalled()
    expect(nombreModifications()).toBe(1)
    expect(mocks.annonceUpdate).toHaveBeenCalledWith({
      where: { id: ANNONCE_A, auteurId: "agent-a" },
      data: { etat: "VENDU" },
    })
    expect(mocks.revalidatePath).toHaveBeenCalled()
  })

  it("autorise un ADMIN à modifier l'état", async () => {
    connecter("admin-a", "ADMIN")
    await expect(updateEtatBien(ANNONCE_A, formulaireEtat("DISPONIBLE")))
      .rejects.toThrow("NEXT_REDIRECT:/agent/annonces/")
    expect(nombreModifications()).toBe(1)
    expect(mocks.annonceUpdate).toHaveBeenCalledWith({
      where: { id: ANNONCE_A }, data: { etat: "DISPONIBLE" },
    })
  })
})

describe("AGENT - Modification complète de l'annonce", () => {
  it.each(profilsInterdits)("refuse un $profil", async ({ session, erreur }) => {
    mocks.getSession.mockResolvedValue(session)
    await expect(updateAnnonce(ANNONCE_A, formulaireEdition())).rejects.toThrow(erreur)
    expect(mocks.getSession).toHaveBeenCalled()
    aucuneModification()
  })

  const entreesInvalides: Array<{ cas: string; champ: string; modifications: Record<string, string> }> = [
    { cas: "prix négatif", champ: "prix", modifications: { prix: "-500" } },
    // La règle est min(3) : "ABC" serait VALIDE. Choisir réellement moins de 3 caractères.
    { cas: "titre trop court", champ: "titre", modifications: { titre: "AB" } },
    { cas: "surface négative", champ: "surface", modifications: { surface: "-12" } },
    { cas: "chambres vides", champ: "chambres", modifications: { chambres: "" } },
    { cas: "type de transaction invalide", champ: "type", modifications: { type: "ECHANGE" } },
    { cas: "type de propriété inconnu", champ: "typePropriete", modifications: { typePropriete: "TERRAIN" } },
    { cas: "date invalide", champ: "dateDisponibilite", modifications: { dateDisponibilite: "date-invalide" } },
  ]

  it.each(entreesInvalides)("refuse un $cas", async ({ modifications, champ }) => {
    connecter("agent-a", "AGENT")
    await expect(updateAnnonce(ANNONCE_A, formulaireEdition(modifications)))
      .rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: [champ] })]),
      })
    aucuneModification()
  })

  it("autorise l'agent propriétaire", async () => {
    connecter("agent-a", "AGENT")
    await expect(updateAnnonce(ANNONCE_A, formulaireEdition()))
      .rejects.toThrow("NEXT_REDIRECT:/agent/annonces/")
    expect(mocks.getSession).toHaveBeenCalled()
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(nombreModifications()).toBe(1)
    expect(mocks.annonceUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ANNONCE_A, auteurId: "agent-a" },
      data: expect.objectContaining({ titre: "Appartement lumineux au Havre" }),
    }))
  })

  it("autorise un ADMIN à modifier une annonce", async () => {
    connecter("admin-a", "ADMIN")
    await expect(updateAnnonce(ANNONCE_A, formulaireEdition()))
      .rejects.toThrow("NEXT_REDIRECT:/agent/annonces/")
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(nombreModifications()).toBe(1)
    expect(mocks.annonceUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: ANNONCE_A },
      data: expect.objectContaining({ titre: "Appartement lumineux au Havre" }),
    }))
  })
})
