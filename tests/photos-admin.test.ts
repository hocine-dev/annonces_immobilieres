import { beforeEach, describe, expect, it, vi } from "vitest"
import path from "node:path"

const UUID = "9fbaba61-55e9-4866-ba6c-ac3607c1cc82"
const uploadedUrl = `/annonces/uploads/${UUID}.png`
const seedUrl = "/annonces/uploads/prop-paris.jpg"

const mock = vi.hoisted(() => ({
  session: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  deleteAnnonce: vi.fn(),
  photoCount: vi.fn(),
  validateAnnonce: vi.fn(),
  validatePhotos: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
  redirect: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mock.session } } }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    annonce: { findUnique: mock.findUnique, update: mock.update, delete: mock.deleteAnnonce },
    photo: { count: mock.photoCount },
  },
}))
vi.mock("@/lib/validators/annonce", () => ({
  createAnnonceSchema: { safeParse: mock.validateAnnonce },
}))
vi.mock("@/lib/validators/photo", () => ({
  MAX_PHOTOS: 10,
  photosSchema: { safeParse: mock.validatePhotos },
}))
vi.mock("@/lib/validators/interaction-annonce", () => ({
  annonceIdSchema: { safeParse: (value: unknown) =>
    typeof value === "string" && value.length > 0 && value.length <= 128
      ? { success: true, data: value }
      : { success: false },
  },
}))
vi.mock("node:fs/promises", () => ({
  mkdir: mock.mkdir, rename: mock.rename, unlink: mock.unlink, writeFile: mock.writeFile,
}))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mock.redirect }))

import { adminUpdateAnnonce } from "@/actions/admin-update-annonce"
import { adminDeleteAnnonce } from "@/actions/admin-delete-annonce"

const validForm = (removePhotoIds: string[] = [], files: File[] = []): FormData => {
  const data = new FormData()
  data.set("titre", "Appartement testé")
  for (const id of removePhotoIds) data.append("removePhotoIds", id)
  for (const file of files) data.append("photos", file)
  return data
}

const deleteForm = (): FormData => {
  const data = new FormData()
  data.set("annonceId", "annonce-1")
  return data
}

beforeEach(() => {
  vi.resetAllMocks()
  mock.session.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
  mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [] })
  mock.update.mockResolvedValue({ id: "annonce-1" })
  mock.deleteAnnonce.mockResolvedValue({ id: "annonce-1" })
  mock.photoCount.mockResolvedValue(0)
  mock.validateAnnonce.mockImplementation((values: Record<string, string>) => ({
    success: true,
    data: { ...values, prix: 300, chambres: 2, surface: 55, dateDisponibilite: new Date("2026-10-17") },
  }))
  mock.validatePhotos.mockReturnValue({ success: true, data: [] })
  mock.mkdir.mockResolvedValue(undefined)
  mock.rename.mockResolvedValue(undefined)
  mock.unlink.mockResolvedValue(undefined)
  mock.writeFile.mockResolvedValue(undefined)
})

describe("Photos — modification d'annonce par ADMIN", () => {
  it("enregistre chaque nouvel upload dans le dossier canonique", async () => {
    const data = validForm([], [new File([new Uint8Array([137, 80, 78, 71])], "photo.png", { type: "image/png" })])
    const state = await adminUpdateAnnonce("annonce-1", { success: false }, data)
    expect(state.success).toBe(true)
    expect(mock.writeFile).toHaveBeenCalledTimes(1)
    const filepath = mock.writeFile.mock.calls[0][0] as string
    expect(filepath).toMatch(/\/public\/annonces\/uploads\/[0-9a-f-]{36}\.png$/i)
    expect(mock.update.mock.calls[0][0].data.photos.create).toEqual([
      { url: expect.stringMatching(/^\/annonces\/uploads\/[0-9a-f-]{36}\.png$/i) },
    ])
  })

  it("refuse qu'un USER administre les photos", async () => {
    mock.session.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
    const state = await adminUpdateAnnonce("annonce-1", { success: false }, validForm())
    expect(state.success).toBe(false)
    expect(mock.update).not.toHaveBeenCalled()
    expect(mock.writeFile).not.toHaveBeenCalled()
  })

  it("refuse une suppression de photo qui n'appartient pas à l'annonce", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ id: "photo-1", url: seedUrl }] })
    const state = await adminUpdateAnnonce("annonce-1", { success: false }, validForm(["photo-autre-annonce"]))
    expect(state.success).toBe(false)
    expect(mock.rename).not.toHaveBeenCalled()
    expect(mock.update).not.toHaveBeenCalled()
  })

  it("ne détruit jamais physiquement une image issue du seed", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ id: "seed-1", url: seedUrl }] })
    const state = await adminUpdateAnnonce("annonce-1", { success: false }, validForm(["seed-1"]))
    expect(state.success).toBe(true)
    expect(mock.rename).not.toHaveBeenCalled()
    expect(mock.unlink).not.toHaveBeenCalled()
    expect(mock.update).toHaveBeenCalled()
  })

  it("ne supprime pas physiquement un upload partagé avec une autre annonce", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ id: "photo-1", url: uploadedUrl }] })
    mock.photoCount.mockResolvedValue(1)
    const state = await adminUpdateAnnonce("annonce-1", { success: false }, validForm(["photo-1"]))
    expect(state.success).toBe(true)
    expect(mock.photoCount).toHaveBeenCalledWith({
      where: { url: uploadedUrl, annonceId: { not: "annonce-1" } },
    })
    expect(mock.rename).not.toHaveBeenCalled()
    expect(mock.unlink).not.toHaveBeenCalled()
  })

  it("déplace un upload UUID vers la corbeille avant de le retirer de la BDD", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ id: "photo-1", url: uploadedUrl }] })
    const state = await adminUpdateAnnonce("annonce-1", { success: false }, validForm(["photo-1"]))
    expect(state.success).toBe(true)
    expect(mock.rename).toHaveBeenCalledTimes(1)
    const original = mock.rename.mock.calls[0][0]
    expect(original).toBe(path.join(process.cwd(), "public", "annonces", "uploads", `${UUID}.png`))
    expect(mock.update).toHaveBeenCalled()
    expect(mock.unlink).toHaveBeenCalledTimes(1)
  })

  it("restaure une photo déplacée lorsque la modification Prisma échoue", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ id: "photo-1", url: uploadedUrl }] })
    mock.update.mockRejectedValueOnce(new Error("BDD indisponible"))
    const state = await adminUpdateAnnonce("annonce-1", { success: false }, validForm(["photo-1"]))
    expect(state.success).toBe(false)
    expect(mock.rename).toHaveBeenCalledTimes(2)
    const [source, staged] = mock.rename.mock.calls[0]
    expect(mock.rename).toHaveBeenLastCalledWith(staged, source)
  })
})

describe("Photos — suppression d'annonce par ADMIN", () => {
  it("refuse de supprimer une annonce pour un utilisateur non ADMIN", async () => {
    mock.session.mockResolvedValue({ user: { id: "agent-1", role: "AGENT" } })
    const state = await adminDeleteAnnonce({ error: "" }, deleteForm())
    expect(state.error).toBeTruthy()
    expect(mock.deleteAnnonce).not.toHaveBeenCalled()
  })

  it("conserve la photo du seed sur le disque lors d'une suppression d'annonce", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ url: seedUrl }] })
    await adminDeleteAnnonce({ error: "" }, deleteForm())
    expect(mock.deleteAnnonce).toHaveBeenCalled()
    expect(mock.rename).not.toHaveBeenCalled()
    expect(mock.unlink).not.toHaveBeenCalled()
  })

  it("conserve un upload UUID utilisé par une autre annonce", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ url: uploadedUrl }] })
    mock.photoCount.mockResolvedValue(2)
    await adminDeleteAnnonce({ error: "" }, deleteForm())
    expect(mock.photoCount).toHaveBeenCalledWith({
      where: { url: uploadedUrl, annonceId: { not: "annonce-1" } },
    })
    expect(mock.rename).not.toHaveBeenCalled()
  })

  it("nettoie un upload UUID non partagé après suppression de l'annonce", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ url: uploadedUrl }] })
    await adminDeleteAnnonce({ error: "" }, deleteForm())
    expect(mock.rename).toHaveBeenCalledTimes(1)
    expect(mock.deleteAnnonce).toHaveBeenCalledTimes(1)
    expect(mock.unlink).toHaveBeenCalledTimes(1)
  })

  it("restaure les fichiers si la suppression Prisma échoue", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ url: uploadedUrl }] })
    mock.deleteAnnonce.mockRejectedValueOnce(new Error("BDD indisponible"))
    const state = await adminDeleteAnnonce({ error: "" }, deleteForm())
    expect(state.error).toBeTruthy()
    expect(mock.rename).toHaveBeenCalledTimes(2)
    const [original, staged] = mock.rename.mock.calls[0]
    expect(mock.rename).toHaveBeenLastCalledWith(staged, original)
    expect(mock.unlink).not.toHaveBeenCalled()
  })

  it("ne touche pas au fichier Hero même si une URL photo pointe dessus", async () => {
    mock.findUnique.mockResolvedValue({ id: "annonce-1", photos: [{ url: "/hero.jpg" }] })
    await adminDeleteAnnonce({ error: "" }, deleteForm())
    expect(mock.rename).not.toHaveBeenCalled()
    expect(mock.unlink).not.toHaveBeenCalled()
  })
})
