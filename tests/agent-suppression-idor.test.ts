
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  findManyPhotos: vi.fn(),
  deleteAnnonce: vi.fn(),
  redirect: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}))

// Simulation de Better Auth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mocks.getSession,
    },
  },
}))

// Simulation de Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    annonce: {
      findUnique: mocks.findUnique,
      delete: mocks.deleteAnnonce,
    },
    photo: {
      findMany: mocks.findManyPhotos,
    },
  },
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

// Empêcher toute suppression physique de fichiers
vi.mock("fs/promises", () => ({
  unlink: mocks.unlink,
  writeFile: mocks.writeFile,
}))

import { deleteAnnonce } from
  "../src/app/agent/details/[id]/actions"

const ANNONCE_A = "annonce-agent-a"

function connecter(
  id: string,
  role: "USER" | "AGENT" | "ADMIN",
) {
  mocks.getSession.mockResolvedValue({
    user: { id, role },
  })
}

describe("IDOR - Suppression des annonces AGENT", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mocks.getSession.mockResolvedValue(null)

    mocks.findUnique.mockResolvedValue({
      id: ANNONCE_A,
      auteurId: "agent-a",
    })

    mocks.findManyPhotos.mockResolvedValue([])

    mocks.deleteAnnonce.mockResolvedValue({
      id: ANNONCE_A,
    })
  })

  it("refuse un visiteur non connecté", async () => {
    await deleteAnnonce(ANNONCE_A)

    expect(
      mocks.deleteAnnonce,
    ).not.toHaveBeenCalled()
  })

  it("refuse un utilisateur USER", async () => {
    connecter("user-1", "USER")

    await deleteAnnonce(ANNONCE_A)

    expect(
      mocks.deleteAnnonce,
    ).not.toHaveBeenCalled()
  })

  it("refuse un agent non propriétaire", async () => {
    connecter("agent-b", "AGENT")

    await deleteAnnonce(ANNONCE_A)

    expect(
      mocks.deleteAnnonce,
    ).not.toHaveBeenCalled()
  })

  it("autorise l'agent propriétaire", async () => {
    connecter("agent-a", "AGENT")

    await deleteAnnonce(ANNONCE_A)

    expect(
      mocks.deleteAnnonce,
    ).toHaveBeenCalledWith({
      where: { id: ANNONCE_A },
    })
  })

  it("autorise un administrateur", async () => {
    connecter("admin-1", "ADMIN")

    await deleteAnnonce(ANNONCE_A)

    expect(
      mocks.deleteAnnonce,
    ).toHaveBeenCalledWith({
      where: { id: ANNONCE_A },
    })
  })

  it("refuse un identifiant vide", async () => {
    connecter("agent-a", "AGENT")

    await deleteAnnonce("")

    expect(
      mocks.deleteAnnonce,
    ).not.toHaveBeenCalled()
  })
})
