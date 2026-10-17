
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

// Simulations des dépendances serveur
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
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
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
    },
  },
}))

import { adminChangeEtat } from
  "../src/actions/admin-etat-annonce"

function formData(
  etat: string,
  annonceId = "annonce-test",
) {
  const data = new FormData()
  data.set("annonceId", annonceId)
  data.set("etat", etat)
  return data
}

async function modifier(
  etat: string,
  annonceId = "annonce-test",
) {
  return adminChangeEtat(
    { success: false, message: "" },
    formData(etat, annonceId),
  )
}

function connecter(role: "USER" | "AGENT" | "ADMIN") {
  mocks.getSession.mockResolvedValue({
    user: {
      id: "utilisateur-test",
      role,
    },
  })
}

describe("Autorisations ADMIN - État des biens", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mocks.getSession.mockResolvedValue(null)

    mocks.findUnique.mockResolvedValue({
      id: "annonce-test",
      type: "VENTE",
    })

    mocks.updateMany.mockResolvedValue({
      count: 1,
    })
  })

  it("refuse un visiteur non connecté", async () => {
    const result = await modifier("VENDU")

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      "Vous devez être connecté.",
    )

    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it.each(["USER", "AGENT"] as const)(
    "refuse le rôle %s",
    async (role) => {
      connecter(role)

      const result = await modifier("VENDU")

      expect(result.success).toBe(false)
      expect(result.message).toBe(
        "Action non autorisée.",
      )

      expect(mocks.findUnique).not.toHaveBeenCalled()
      expect(mocks.updateMany).not.toHaveBeenCalled()
    },
  )

  it("refuse un identifiant vide", async () => {
    connecter("ADMIN")

    const result = await modifier("VENDU", "")

    expect(result.success).toBe(false)
    expect(mocks.findUnique).not.toHaveBeenCalled()
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it("refuse un état inconnu", async () => {
    connecter("ADMIN")

    const result = await modifier("RESERVE")

    expect(result.success).toBe(false)
    expect(result.message).toBe("Données invalides.")
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it("refuse une annonce inexistante", async () => {
    connecter("ADMIN")
    mocks.findUnique.mockResolvedValue(null)

    const result = await modifier("VENDU")

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      "Annonce introuvable.",
    )

    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it("interdit de louer une vente", async () => {
    connecter("ADMIN")

    mocks.findUnique.mockResolvedValue({
      id: "annonce-test",
      type: "VENTE",
    })

    const result = await modifier("LOUE")

    expect(result.success).toBe(false)
    expect(result.message).toContain(
      "ne peut pas être loué",
    )

    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it("interdit de vendre une location", async () => {
    connecter("ADMIN")

    mocks.findUnique.mockResolvedValue({
      id: "annonce-test",
      type: "LOCATION",
    })

    const result = await modifier("VENDU")

    expect(result.success).toBe(false)
    expect(result.message).toContain(
      "ne peut pas être vendu",
    )

    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it("autorise un ADMIN à vendre un bien", async () => {
    connecter("ADMIN")

    const result = await modifier("VENDU")

    expect(result.success).toBe(true)
    expect(result.etat).toBe("VENDU")

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "annonce-test",
        type: "VENTE",
      },
      data: {
        etat: "VENDU",
      },
    })

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/dashboard",
    )
  })

  it("autorise un ADMIN à louer un bien", async () => {
    connecter("ADMIN")

    mocks.findUnique.mockResolvedValue({
      id: "annonce-test",
      type: "LOCATION",
    })

    const result = await modifier("LOUE")

    expect(result.success).toBe(true)
    expect(result.etat).toBe("LOUE")

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "annonce-test",
        type: "LOCATION",
      },
      data: {
        etat: "LOUE",
      },
    })
  })

  it("détecte une modification concurrente", async () => {
    connecter("ADMIN")

    mocks.updateMany.mockResolvedValue({
      count: 0,
    })

    const result = await modifier("VENDU")

    expect(result.success).toBe(false)
    expect(result.message).toContain(
      "modifiée entre-temps",
    )
  })

  it("gère une erreur Prisma", async () => {
    connecter("ADMIN")

    mocks.updateMany.mockRejectedValue(
      new Error("Erreur de base de données"),
    )

    const result = await modifier("VENDU")

    expect(result.success).toBe(false)
    expect(result.message).toBe(
      "Impossible de modifier l'état du bien.",
    )
  })
})
