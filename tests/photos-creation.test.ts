import { beforeEach, describe, expect, it, vi } from "vitest"
import path from "node:path"

// Aucun accès à PostgreSQL ni au vrai disque : toutes les mutations sont simulées.
const mock = vi.hoisted(() => ({
  session: vi.fn(),
  prismaCreate: vi.fn(),
  validateAnnonce: vi.fn(),
  validatePhotos: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mock.session } } }))
vi.mock("@/lib/prisma", () => ({ prisma: { annonce: { create: mock.prismaCreate } } }))
vi.mock("@/lib/validators/annonce", () => ({
  createAnnonceSchema: { safeParse: mock.validateAnnonce },
}))
vi.mock("@/lib/validators/photo", () => ({
  photosSchema: { safeParse: mock.validatePhotos },
}))
vi.mock("node:fs/promises", () => ({
  mkdir: mock.mkdir,
  writeFile: mock.writeFile,
  unlink: mock.unlink,
}))
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidatePath }))

import { createAnnonce } from "@/actions/annonce"

const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])

function form(photos: File[] = []): FormData {
  const data = new FormData()
  data.set("titre", "Appartement test")
  data.set("ville", "Le Havre")
  for (const photo of photos) data.append("photos", photo)
  return data
}

beforeEach(() => {
  vi.resetAllMocks()
  mock.session.mockResolvedValue({ user: { id: "agent-1", role: "AGENT" } })
  mock.prismaCreate.mockResolvedValue({ id: "annonce-1" })
  mock.validateAnnonce.mockImplementation((values: Record<string, string>) => ({
    success: true,
    data: { ...values, prix: 100, surface: 45, chambres: 1, dateDisponibilite: new Date("2026-10-17") },
  }))
  mock.validatePhotos.mockReturnValue({ success: true, data: [] })
  mock.mkdir.mockResolvedValue(undefined)
  mock.writeFile.mockResolvedValue(undefined)
  mock.unlink.mockResolvedValue(undefined)
})

describe("Photos — création d'annonce", () => {
  it("enregistre un PNG sous public/annonces/uploads et une URL canonique en BDD", async () => {
    const result = await createAnnonce(
      { success: false },
      form([new File([png], "mon-image.png", { type: "image/png" })]),
    )

    expect(result.success).toBe(true)
    expect(mock.mkdir).toHaveBeenCalledWith(
      path.join(process.cwd(), "public", "annonces", "uploads"),
      { recursive: true },
    )
    const [writtenPath, bytes] = mock.writeFile.mock.calls[0]
    expect(writtenPath).toMatch(/\/public\/annonces\/uploads\/[0-9a-f-]{36}\.png$/i)
    expect(Buffer.isBuffer(bytes)).toBe(true)
    const dbCall = mock.prismaCreate.mock.calls[0][0]
    expect(dbCall.data.photos.create).toEqual([
      { url: expect.stringMatching(/^\/annonces\/uploads\/[0-9a-f-]{36}\.png$/i) },
    ])
    expect(writtenPath).toBe(path.join(process.cwd(), "public", dbCall.data.photos.create[0].url.slice(1)))
  })

  it("n'écrit aucun fichier pour un visiteur", async () => {
    mock.session.mockResolvedValue(null)
    expect((await createAnnonce({ success: false }, form())).success).toBe(false)
    expect(mock.writeFile).not.toHaveBeenCalled()
    expect(mock.prismaCreate).not.toHaveBeenCalled()
  })

  it("n'écrit aucun fichier pour un utilisateur USER", async () => {
    mock.session.mockResolvedValue({ user: { id: "user-1", role: "USER" } })
    expect((await createAnnonce({ success: false }, form())).success).toBe(false)
    expect(mock.prismaCreate).not.toHaveBeenCalled()
  })

  it("ne persiste rien si la validation des photos échoue", async () => {
    mock.validatePhotos.mockReturnValue({
      success: false,
      error: { issues: [{ message: "Format interdit" }] },
    })
    const state = await createAnnonce(
      { success: false },
      form([new File(["x"], "photo.svg", { type: "image/svg+xml" })]),
    )
    expect(state.success).toBe(false)
    expect(mock.writeFile).not.toHaveBeenCalled()
    expect(mock.prismaCreate).not.toHaveBeenCalled()
  })

  it("n'ajoute pas d'annonce lorsque l'écriture d'une photo échoue", async () => {
    mock.writeFile.mockRejectedValueOnce(new Error("Disque plein"))
    const result = await createAnnonce(
      { success: false },
      form([new File([png], "photo.png", { type: "image/png" })]),
    )
    expect(result.success).toBe(false)
    expect(mock.prismaCreate).not.toHaveBeenCalled()
  })

  it("efface la photo déjà écrite si Prisma refuse la création", async () => {
    mock.prismaCreate.mockRejectedValueOnce(new Error("BDD indisponible"))
    const result = await createAnnonce(
      { success: false },
      form([new File([png], "photo.png", { type: "image/png" })]),
    )
    expect(result.success).toBe(false)
    expect(mock.unlink).toHaveBeenCalledTimes(1)
    expect(mock.unlink).toHaveBeenCalledWith(mock.writeFile.mock.calls[0][0])
  })

  it("ne touche jamais au Hero lors de la création", async () => {
    await createAnnonce({ success: false }, form([new File([png], "photo.png", { type: "image/png" })]))
    expect(mock.unlink).not.toHaveBeenCalledWith(expect.stringContaining("hero.jpg"))
    expect(mock.writeFile.mock.calls.every(([target]) => String(target).includes("/public/annonces/uploads/"))).toBe(true)
  })
})
