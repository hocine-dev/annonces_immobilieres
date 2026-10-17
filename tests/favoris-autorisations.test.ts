
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  annonceFindFirst: vi.fn(),
  favoriFindUnique: vi.fn(),
  favoriCreate: vi.fn(),
  favoriDelete: vi.fn(),
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
      findFirst: mocks.annonceFindFirst,
    },
    favori: {
      findUnique: mocks.favoriFindUnique,
      create: mocks.favoriCreate,
      delete: mocks.favoriDelete,
    },
  },
}))

import { toggleFavori } from "@/actions/favori"

type Role = "USER" | "AGENT" | "ADMIN"

function connecter(
  id: string,
  role: Role,
) {
  mocks.getSession.mockResolvedValue({
    user: { id, role },
  })
}

function formulaire(
  annonceId = "annonce-test",
) {
  const data = new FormData()
  data.set("annonceId", annonceId)
  return data
}

describe("Autorisations - Favoris", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mocks.getSession.mockResolvedValue(null)

    mocks.annonceFindFirst.mockResolvedValue({
      id: "annonce-test",
    })

    // Par défaut, le favori n'existe pas.
    mocks.favoriFindUnique.mockResolvedValue(null)

    mocks.favoriCreate.mockResolvedValue({
      id: "favori-test",
    })

    mocks.favoriDelete.mockResolvedValue({
      id: "favori-test",
    })
  })

  it("refuse un visiteur non connecté", async () => {
    const result = await toggleFavori(formulaire())

    expect(result.success).toBe(false)

    expect(
      mocks.annonceFindFirst,
    ).not.toHaveBeenCalled()

    expect(
      mocks.favoriCreate,
    ).not.toHaveBeenCalled()
  })

  it("refuse un AGENT", async () => {
    connecter("agent-a", "AGENT")

    const result = await toggleFavori(formulaire())

    expect(result.success).toBe(false)
    expect(mocks.favoriCreate).not.toHaveBeenCalled()
    expect(mocks.favoriDelete).not.toHaveBeenCalled()
  })

  it("autorise un USER à ajouter un favori", async () => {
    connecter("user-a", "USER")

    const result = await toggleFavori(formulaire())

    expect(result.success).toBe(true)
    expect(result.isFavorite).toBe(true)

    expect(mocks.annonceFindFirst).toHaveBeenCalledWith({
      where: {
        id: "annonce-test",
        statut: "PUBLIE",
      },
      select: { id: true },
    })

    expect(mocks.favoriCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-a",
        annonceId: "annonce-test",
      },
    })

    expect(mocks.favoriDelete).not.toHaveBeenCalled()

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/dashboard",
    )

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/annonces/annonce-test",
    )
  })

  it("autorise un ADMIN à ajouter un favori", async () => {
    connecter("admin-a", "ADMIN")

    const result = await toggleFavori(formulaire())

    expect(result.success).toBe(true)
    expect(result.isFavorite).toBe(true)

    expect(mocks.favoriCreate).toHaveBeenCalledWith({
      data: {
        userId: "admin-a",
        annonceId: "annonce-test",
      },
    })
  })

  it("permet à un USER de retirer son favori", async () => {
    connecter("user-a", "USER")

    mocks.favoriFindUnique.mockResolvedValue({
      id: "favori-existant",
      userId: "user-a",
      annonceId: "annonce-test",
    })

    const result = await toggleFavori(formulaire())

    expect(result.success).toBe(true)
    expect(result.isFavorite).toBe(false)

    expect(mocks.favoriFindUnique).toHaveBeenCalledWith({
      where: {
        userId_annonceId: {
          userId: "user-a",
          annonceId: "annonce-test",
        },
      },
    })

    expect(mocks.favoriDelete).toHaveBeenCalledWith({
      where: {
        id: "favori-existant",
      },
    })

    expect(mocks.favoriCreate).not.toHaveBeenCalled()
  })

  it("ignore un userId falsifié", async () => {
    connecter("user-a", "USER")

    const data = formulaire()
    data.set("userId", "user-b")

    const result = await toggleFavori(data)

    expect(result.success).toBe(true)

    expect(mocks.favoriCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-a",
        annonceId: "annonce-test",
      },
    })

    expect(mocks.favoriFindUnique).toHaveBeenCalledWith({
      where: {
        userId_annonceId: {
          userId: "user-a",
          annonceId: "annonce-test",
        },
      },
    })
  })

  it("refuse un identifiant d'annonce vide", async () => {
    connecter("user-a", "USER")

    const result = await toggleFavori(
      formulaire(""),
    )

    expect(result.success).toBe(false)
    expect(result.message).toBe("Annonce invalide.")

    expect(mocks.annonceFindFirst).not.toHaveBeenCalled()
    expect(mocks.favoriCreate).not.toHaveBeenCalled()
    expect(mocks.favoriDelete).not.toHaveBeenCalled()
  })

  it("refuse une annonce non publiée ou inexistante", async () => {
    connecter("user-a", "USER")

    mocks.annonceFindFirst.mockResolvedValue(null)

    const result = await toggleFavori(formulaire())

    expect(result.success).toBe(false)

    expect(mocks.annonceFindFirst).toHaveBeenCalledWith({
      where: {
        id: "annonce-test",
        statut: "PUBLIE",
      },
      select: { id: true },
    })

    expect(mocks.favoriCreate).not.toHaveBeenCalled()
    expect(mocks.favoriDelete).not.toHaveBeenCalled()
  })

  it("supprime les espaces autour de l'identifiant", async () => {
    connecter("user-a", "USER")

    const result = await toggleFavori(
      formulaire("  annonce-test  "),
    )

    expect(result.success).toBe(true)

    expect(mocks.annonceFindFirst).toHaveBeenCalledWith({
      where: {
        id: "annonce-test",
        statut: "PUBLIE",
      },
      select: { id: true },
    })
  })

  it("ne réactualise pas les pages après un refus", async () => {
    connecter("agent-a", "AGENT")

    await toggleFavori(formulaire())

    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(mocks.favoriCreate).not.toHaveBeenCalled()
    expect(mocks.favoriDelete).not.toHaveBeenCalled()
  })
})
