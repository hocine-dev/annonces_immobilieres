import { beforeEach, describe, expect, it, vi } from "vitest"
import path from "node:path"

// Tests de contrat sur le code AGENT original de Mohamed.
// Ils signalent les défauts SANS changer son fichier ni les assertions pour les faire passer.
// Le système de fichiers et Prisma sont intégralement simulés.
const mock = vi.hoisted(() => ({
  session: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  annonceUpdate: vi.fn(),
  annonceUpdateMany: vi.fn(),
  annonceDelete: vi.fn(),
  annonceDeleteMany: vi.fn(),
  photoFindMany: vi.fn(),
  photoDeleteMany: vi.fn(),
  photoCreate: vi.fn(),
  photoCreateMany: vi.fn(),
  photoCount: vi.fn(),
  transaction: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mock.session } } }))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidatePath }))
vi.mock("next/navigation", () => ({
  redirect: mock.redirect,
  notFound: () => { throw new Error("NEXT_NOT_FOUND") },
}))
vi.mock("node:fs/promises", () => ({
  writeFile: mock.writeFile, unlink: mock.unlink, mkdir: mock.mkdir, rename: mock.rename,
}))
vi.mock("fs/promises", () => ({
  writeFile: mock.writeFile, unlink: mock.unlink, mkdir: mock.mkdir, rename: mock.rename,
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    annonce: {
      findFirst: mock.findFirst,
      findUnique: mock.findUnique,
      update: mock.annonceUpdate,
      updateMany: mock.annonceUpdateMany,
      delete: mock.annonceDelete,
      deleteMany: mock.annonceDeleteMany,
    },
    photo: {
      findMany: mock.photoFindMany,
      deleteMany: mock.photoDeleteMany,
      create: mock.photoCreate,
      createMany: mock.photoCreateMany,
      count: mock.photoCount,
    },
    $transaction: mock.transaction,
  },
}))

import {
  deleteAnnonce,
  updateAnnonce,
  updateEtatBien,
  updateStatutPublication,
} from "@/app/agent/annonces/[id]/actions"

const uuidUrl = "/annonces/uploads/9fbaba61-55e9-4866-ba6c-ac3607c1cc82.png"

function form(fields: Record<string, string> = {}): FormData {
  const result = new FormData()
  const values = {
    titre: "Appartement T3 lumineux",
    description: "Un appartement lumineux proche du centre avec balcon et parking.",
    type: "VENTE",
    typePropriete: "APPARTEMENT",
    ville: "Le Havre",
    prix: "250000",
    surface: "65",
    chambres: "2",
    dateDisponibilite: "2026-11-15",
    ...fields,
  }
  for (const [key, value] of Object.entries(values)) result.set(key, value)
  return result
}

async function ignoreRejection(action: Promise<unknown>): Promise<void> {
  // Les actions sécurisées peuvent refuser l'opération par une exception ou un retour d'erreur.
  try { await action } catch { /* refus attendu */ }
}

beforeEach(() => {
  vi.resetAllMocks()
  mock.session.mockResolvedValue({ user: { id: "agent-b", role: "AGENT" } })
  mock.findFirst.mockResolvedValue(null)
  mock.findUnique.mockResolvedValue({
    id: "annonce-a",
    auteurId: "agent-a",
    type: "VENTE",
  })
  mock.annonceUpdate.mockResolvedValue({ id: "annonce-a" })
  mock.annonceUpdateMany.mockResolvedValue({ count: 0 })
  mock.annonceDelete.mockResolvedValue({ id: "annonce-a" })
  mock.annonceDeleteMany.mockResolvedValue({ count: 0 })
  mock.photoFindMany.mockResolvedValue([])
  mock.photoDeleteMany.mockResolvedValue({ count: 0 })
  mock.photoCreate.mockResolvedValue({ id: "photo-nouvelle" })
  mock.photoCreateMany.mockResolvedValue({ count: 1 })
  mock.photoCount.mockResolvedValue(0)
  mock.writeFile.mockResolvedValue(undefined)
  mock.unlink.mockResolvedValue(undefined)
  mock.mkdir.mockResolvedValue(undefined)
  mock.rename.mockResolvedValue(undefined)
  mock.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({ annonce: { update: mock.annonceUpdate, updateMany: mock.annonceUpdateMany }, photo: { deleteMany: mock.photoDeleteMany, createMany: mock.photoCreateMany } }),
  )
})

describe("Photos — sécurité des Server Actions AGENT (régressions)", () => {
  it("refuse la modification de l'annonce d'un autre agent", async () => {
    await ignoreRejection(updateAnnonce("annonce-a", form()))
    expect(mock.session).toHaveBeenCalled()
    expect(mock.annonceUpdate).not.toHaveBeenCalled()
    expect(mock.annonceUpdateMany).not.toHaveBeenCalled()
  })

  it("refuse la suppression de l'annonce d'un autre agent", async () => {
    await ignoreRejection(deleteAnnonce("annonce-a"))
    expect(mock.session).toHaveBeenCalled()
    expect(mock.annonceDelete).not.toHaveBeenCalled()
    expect(mock.annonceDeleteMany).not.toHaveBeenCalled()
  })

  it("refuse de modifier le statut de l'annonce d'un autre agent", async () => {
    const data = new FormData()
    data.set("statut", "PUBLIE")
    await ignoreRejection(updateStatutPublication("annonce-a", data))
    expect(mock.session).toHaveBeenCalled()
    expect(mock.annonceUpdate).not.toHaveBeenCalled()
    expect(mock.annonceUpdateMany).not.toHaveBeenCalled()
  })

  it("refuse de changer l'état d'une annonce appartenant à un autre agent", async () => {
    const data = new FormData()
    data.set("etat", "VENDU")
    await ignoreRejection(updateEtatBien("annonce-a", data))
    expect(mock.session).toHaveBeenCalled()
    expect(mock.annonceUpdate).not.toHaveBeenCalled()
    expect(mock.annonceUpdateMany).not.toHaveBeenCalled()
  })

  it("ne supprime jamais une photo étrangère fournie par son ID", async () => {
    // Simule une session légitime pour l'annonce A, mais un ID photo de l'annonce B.
    mock.session.mockResolvedValue({ user: { id: "agent-a", role: "AGENT" } })
    mock.findFirst.mockResolvedValue({ id: "annonce-a", photos: [] })
    mock.annonceUpdateMany.mockResolvedValue({ count: 1 })
    mock.photoFindMany.mockImplementation(
      async (query: { where?: { annonceId?: string } }) =>
        query.where?.annonceId === "annonce-a"
          ? []
          : [{ id: "photo-b", url: uuidUrl }],
    )
    const data = form()
    data.append("deletePhotos", "photo-b")

    await ignoreRejection(updateAnnonce("annonce-a", data))
    expect(mock.photoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ annonceId: "annonce-a" }),
      }),
    )
    expect(mock.photoDeleteMany).not.toHaveBeenCalled()
    expect(mock.unlink).not.toHaveBeenCalled()
  })

  it("conserve les images du seed lors de la suppression d'une annonce", async () => {
    mock.session.mockResolvedValue({ user: { id: "agent-a", role: "AGENT" } })
    mock.findFirst.mockResolvedValue({ id: "annonce-a", photos: [{ id: "seed-1", url: "/annonces/uploads/prop-paris.jpg" }] })
    mock.annonceDeleteMany.mockResolvedValue({ count: 1 })
    mock.photoFindMany.mockResolvedValue([{ url: "/annonces/uploads/prop-paris.jpg" }])

    await ignoreRejection(deleteAnnonce("annonce-a"))
    expect(mock.unlink).not.toHaveBeenCalled()
  })

  it("place tout nouvel upload AGENT sous public/annonces/uploads", async () => {
    mock.session.mockResolvedValue({ user: { id: "agent-a", role: "AGENT" } })
    mock.findFirst.mockResolvedValue({ id: "annonce-a", photos: [] })
    mock.annonceUpdateMany.mockResolvedValue({ count: 1 })
    const data = form()
    data.append("newPhotos", new File([Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC",
      "base64",
    )], "photo.png", { type: "image/png" }))

    await ignoreRejection(updateAnnonce("annonce-a", data))
    expect(mock.writeFile).toHaveBeenCalled()
    const writtenPath = mock.writeFile.mock.calls[0][0] as string
    expect(path.dirname(writtenPath)).toBe(path.join(process.cwd(), "public", "annonces", "uploads"))
  })

  it("rejette un upload SVG potentiellement actif", async () => {
    mock.session.mockResolvedValue({ user: { id: "agent-a", role: "AGENT" } })
    mock.findFirst.mockResolvedValue({ id: "annonce-a", photos: [] })
    mock.annonceUpdateMany.mockResolvedValue({ count: 1 })
    const data = form()
    data.append("newPhotos", new File(["<svg onload=alert(1) />"], "photo.svg", { type: "image/svg+xml" }))

    await ignoreRejection(updateAnnonce("annonce-a", data))
    expect(mock.writeFile).not.toHaveBeenCalled()
    expect(mock.photoCreate).not.toHaveBeenCalled()
    expect(mock.photoCreateMany).not.toHaveBeenCalled()
  })
})
