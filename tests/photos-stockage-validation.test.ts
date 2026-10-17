import { describe, expect, it } from "vitest"
import path from "node:path"

import { disposableAnnonceUploadPath } from "@/lib/annonce-photo-storage"
import { MAX_PHOTOS, photosSchema } from "@/lib/validators/photo"

const UUID = "9fbaba61-55e9-4866-ba6c-ac3607c1cc82"
const canonical = (name: string) => `/annonces/uploads/${name}`
const image = (name: string, type: string, size = 1024) => ({ name, type, size })

describe("Photos — stockage unique et chemins sûrs", () => {
  it.each(["jpg", "png", "webp"])("reconnaît un upload UUID en .%s", (ext) => {
    expect(disposableAnnonceUploadPath(canonical(`${UUID}.${ext}`))).toBe(
      path.join(process.cwd(), "public", "annonces", "uploads", `${UUID}.${ext}`),
    )
  })

  it("accepte les UUID en majuscules sans sortir du répertoire prévu", () => {
    const name = `${UUID.toUpperCase()}.JPG`
    expect(disposableAnnonceUploadPath(canonical(name))).toBe(
      path.join(process.cwd(), "public", "annonces", "uploads", name),
    )
  })

  it.each([
    "/hero.jpg",
    "/images/prop-maison.jpg",
    "/uploads/annonces/9fbaba61-55e9-4866-ba6c-ac3607c1cc82.png",
    "/annonces/uploads/prop-paris.jpg",
    "/annonces/uploads/annonce-12345.png",
    "/annonces/uploads/../../hero.jpg",
    "/annonces/uploads/%2e%2e%2fhero.jpg",
    "/annonces/uploads/9fbaba61-55e9-4866-ba6c-ac3607c1cc82.svg",
    "https://example.com/annonces/uploads/9fbaba61-55e9-4866-ba6c-ac3607c1cc82.png",
  ])("refuse la suppression physique d'une ressource non autorisée : %s", (url) => {
    expect(disposableAnnonceUploadPath(url)).toBeNull()
  })
})

describe("Photos — validation des fichiers entrants", () => {
  it.each([
    ["photo.jpg", "image/jpeg"],
    ["photo.png", "image/png"],
    ["photo.webp", "image/webp"],
  ])("accepte un fichier %s déclaré %s", (name, type) => {
    expect(photosSchema.safeParse([image(name, type)]).success).toBe(true)
  })

  it.each([
    ["attaque.svg", "image/svg+xml"],
    ["texte.txt", "text/plain"],
    ["programme.exe", "application/octet-stream"],
  ])("refuse un fichier non autorisé : %s", (name, type) => {
    expect(photosSchema.safeParse([image(name, type)]).success).toBe(false)
  })

  it("refuse un fichier excessivement volumineux", () => {
    expect(photosSchema.safeParse([image("geante.png", "image/png", 1024 ** 3)]).success).toBe(false)
  })

  it("refuse plus de photos que MAX_PHOTOS", () => {
    expect(MAX_PHOTOS).toBeGreaterThan(0)
    const files = Array.from({ length: MAX_PHOTOS + 1 }, (_, i) =>
      image(`photo-${i}.png`, "image/png"),
    )
    expect(photosSchema.safeParse(files).success).toBe(false)
  })
})
