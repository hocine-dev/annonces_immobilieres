import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUnique: vi.fn(),
  findManyPhotos: vi.fn(),
  photoCount: vi.fn(),
  deleteAnnonce: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
  revalidatePath: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    annonce: { findUnique: mocks.findUnique, delete: mocks.deleteAnnonce },
    photo: { findMany: mocks.findManyPhotos, count: mocks.photoCount },
  },
}))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("node:fs/promises", () => ({
  unlink: mocks.unlink, writeFile: mocks.writeFile, mkdir: mocks.mkdir, rename: mocks.rename,
}))
vi.mock("fs/promises", () => ({
  unlink: mocks.unlink, writeFile: mocks.writeFile, mkdir: mocks.mkdir, rename: mocks.rename,
}))

import { deleteAnnonce } from "../src/app/agent/annonces/[id]/actions"

const ANNONCE_A = "annonce-agent-a"

function connecter(id: string, role: "USER" | "AGENT" | "ADMIN") {
  mocks.getSession.mockResolvedValue({ user: { id, role } })
}

function aucuneSuppression() {
  expect(mocks.deleteAnnonce).not.toHaveBeenCalled()
  expect(mocks.findManyPhotos).not.toHaveBeenCalled()
  expect(mocks.unlink).not.toHaveBeenCalled()
  expect(mocks.rename).not.toHaveBeenCalled()
}

describe("IDOR - Suppression des annonces AGENT", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.getSession.mockResolvedValue(null)
    mocks.redirect.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND")
    })
    mocks.findUnique.mockResolvedValue({ id: ANNONCE_A, auteurId: "agent-a", type: "VENTE" })
    mocks.findManyPhotos.mockResolvedValue([])
    mocks.photoCount.mockResolvedValue(0)
    mocks.deleteAnnonce.mockResolvedValue({ id: ANNONCE_A })
    mocks.unlink.mockResolvedValue(undefined)
    mocks.writeFile.mockResolvedValue(undefined)
    mocks.mkdir.mockResolvedValue(undefined)
    mocks.rename.mockResolvedValue(undefined)
  })

  it("refuse un visiteur non connecté", async () => {
    await expect(deleteAnnonce(ANNONCE_A)).rejects.toThrow("NEXT_REDIRECT:/login")
    aucuneSuppression()
  })

  it("refuse un utilisateur USER", async () => {
    connecter("user-1", "USER")
    await expect(deleteAnnonce(ANNONCE_A)).rejects.toThrow("NEXT_NOT_FOUND")
    aucuneSuppression()
  })

  it("refuse un agent non propriétaire", async () => {
    connecter("agent-b", "AGENT")
    await expect(deleteAnnonce(ANNONCE_A)).rejects.toThrow("NEXT_NOT_FOUND")
    aucuneSuppression()
  })

  it("autorise l'agent propriétaire", async () => {
    connecter("agent-a", "AGENT")
    await expect(deleteAnnonce(ANNONCE_A))
      .rejects.toThrow("NEXT_REDIRECT:/agent/dashboard?toast=delete_ok")
    expect(mocks.deleteAnnonce).toHaveBeenCalledWith({
      where: { id: ANNONCE_A, auteurId: "agent-a" },
    })
    expect(mocks.revalidatePath).toHaveBeenCalled()
  })

  it("autorise un administrateur", async () => {
    connecter("admin-1", "ADMIN")
    await expect(deleteAnnonce(ANNONCE_A))
      .rejects.toThrow("NEXT_REDIRECT:/agent/dashboard?toast=delete_ok")
    expect(mocks.deleteAnnonce).toHaveBeenCalledWith({
      where: { id: ANNONCE_A },
    })
  })

  it("refuse un identifiant vide", async () => {
    connecter("agent-a", "AGENT")
    await expect(deleteAnnonce("")).rejects.toThrow("NEXT_NOT_FOUND")
    aucuneSuppression()
  })
})
