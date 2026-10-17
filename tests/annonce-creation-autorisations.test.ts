
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  create: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    annonce: {
      create: mocks.create,
    },
  },
}))

// Aucun fichier réellement écrit ou supprimé
vi.mock("node:fs/promises", () => ({
  mkdir: mocks.mkdir,
  writeFile: mocks.writeFile,
  unlink: mocks.unlink,
}))

import { createAnnonce } from "@/actions/annonce"

type Role = "USER" | "AGENT" | "ADMIN"

function connecter(id: string, role: Role) {
  mocks.getSession.mockResolvedValue({
    user: { id, role },
  })
}

function formulaireValide(): FormData {
  const data = new FormData()

  data.set("titre", "Appartement lumineux à Paris")
  data.set(
    "description",
    "Appartement moderne avec balcon, parking et ascenseur.",
  )
  data.set("type", "VENTE")
  data.set("typePropriete", "APPARTEMENT")
  data.set("prix", "250000")
  data.set("dateDisponibilite", "2026-11-01")
  data.set("ville", "Paris")
  data.set("surface", "75")
  data.set("chambres", "2")

  // Photo fictive : aucune écriture réelle
  data.append(
    "photos",
    new File(
      ["photo de test"],
      "appartement.jpg",
      { type: "image/jpeg" },
    ),
  )

  return data
}

async function creer(data = formulaireValide()) {
  return createAnnonce(
    { success: false },
    data,
  )
}

describe("Autorisations - Création d'annonces", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mocks.getSession.mockResolvedValue(null)

    mocks.create.mockResolvedValue({
      id: "nouvelle-annonce",
    })

    mocks.mkdir.mockResolvedValue(undefined)
    mocks.writeFile.mockResolvedValue(undefined)
    mocks.unlink.mockResolvedValue(undefined)
  })

  it("refuse un visiteur non connecté", async () => {
    const result = await creer()

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      "Vous devez être connecté.",
    )

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it("refuse un utilisateur USER", async () => {
    connecter("user-1", "USER")

    const result = await creer()

    expect(result.success).toBe(false)
    expect(result.message).toContain(
      "pas autorisé",
    )

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it("refuse un USER qui falsifie son rôle", async () => {
    connecter("user-1", "USER")

    const data = formulaireValide()
    data.set("role", "ADMIN")

    const result = await creer(data)

    expect(result.success).toBe(false)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("autorise un AGENT à créer son annonce", async () => {
    connecter("agent-a", "AGENT")

    const result = await creer()

    expect(result.success).toBe(true)
    expect(result.annonceId).toBe("nouvelle-annonce")

    expect(mocks.create).toHaveBeenCalledOnce()

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          auteurId: "agent-a",
          type: "VENTE",
          prix: 250000,
        }),
      }),
    )

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/annonces",
    )
  })

  it("autorise un ADMIN à créer une annonce", async () => {
    connecter("admin-1", "ADMIN")

    const result = await creer()

    expect(result.success).toBe(true)

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          auteurId: "admin-1",
        }),
      }),
    )
  })

  it("ignore un auteurId falsifié dans le formulaire", async () => {
    connecter("agent-b", "AGENT")

    const data = formulaireValide()

    // Tentative de créer une annonce au nom d'un autre agent
    data.set("auteurId", "agent-a")

    const result = await creer(data)

    expect(result.success).toBe(true)

    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          auteurId: "agent-b",
        }),
      }),
    )
  })

  it("refuse un prix négatif", async () => {
    connecter("agent-a", "AGENT")

    const data = formulaireValide()
    data.set("prix", "-100")

    const result = await creer(data)

    expect(result.success).toBe(false)
    expect(result.errors?.prix).toBeDefined()

    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it("refuse un titre trop court", async () => {
    connecter("agent-a", "AGENT")

    const data = formulaireValide()
    data.set("titre", "ABC")

    const result = await creer(data)

    expect(result.success).toBe(false)
    expect(result.errors?.titre).toBeDefined()

    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("refuse un champ chambres vide", async () => {
    connecter("agent-a", "AGENT")

    const data = formulaireValide()
    data.set("chambres", "")

    const result = await creer(data)

    expect(result.success).toBe(false)
    expect(result.errors?.chambres).toBeDefined()

    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("gère une erreur Prisma et nettoie les photos", async () => {
    connecter("agent-a", "AGENT")

    mocks.create.mockRejectedValue(
      new Error("Erreur Prisma simulée"),
    )

    const result = await creer()

    expect(result.success).toBe(false)
    expect(result.message).toContain(
      "erreur est survenue",
    )

    // Une photo a été écrite, puis supprimée
    expect(mocks.writeFile).toHaveBeenCalledOnce()
    expect(mocks.unlink).toHaveBeenCalledOnce()

    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
