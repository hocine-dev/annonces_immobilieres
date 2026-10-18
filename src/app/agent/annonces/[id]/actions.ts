"use server"

import { randomUUID } from "node:crypto"
import { mkdir, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const idSchema = z.string().min(1).max(128)
const statutSchema = z.enum(["BROUILLON", "PUBLIE"])
const etatSchema = z.enum(["DISPONIBLE", "LOUE", "VENDU"])

const moneySchema = z.string().trim().min(1).transform(Number).pipe(z.number().finite().positive().max(999999999))
const positiveIntegerSchema = z.string().trim().min(1).transform(Number).pipe(z.number().int().positive())
const nonnegativeIntegerSchema = z.string().trim().min(1).transform(Number).pipe(z.number().int().min(0))

const annonceSchema = z.object({
  titre: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10),
  ville: z.string().trim().min(2).max(120),
  prix: moneySchema,
  surface: positiveIntegerSchema,
  chambres: nonnegativeIntegerSchema,
  type: z.enum(["VENTE", "LOCATION"]),
  typePropriete: z.enum(["APPARTEMENT", "MAISON", "VILLA", "STUDIO", "LOFT"]),
  dateDisponibilite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((s) => new Date(`${s}T00:00:00.000Z`)).refine((d) => !Number.isNaN(d.getTime()), "Date invalide"),
})

type AnnonceScope = {
  id: string
  auteurId: string
  type: "VENTE" | "LOCATION"
  actorId: string
  admin: boolean
}

// Authentification -> autorisation -> validation du formulaire (Zod).
async function authorizedAnnonce(annonceId: string): Promise<AnnonceScope> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const admin = session.user.role === "ADMIN"
  if (session.user.role !== "AGENT" && !admin) notFound()

  const parsedId = idSchema.safeParse(annonceId)
  if (!parsedId.success) notFound()

  const annonce = await prisma.annonce.findUnique({
    where: { id: parsedId.data },
    select: { id: true, auteurId: true, type: true },
  })
  if (!annonce || (!admin && annonce.auteurId !== session.user.id)) notFound()

  return {
    id: annonce.id,
    auteurId: annonce.auteurId,
    type: annonce.type,
    actorId: session.user.id,
    admin,
  }
}

// Le WHERE lie l'écriture aux droits de l'agent, même après le contrôle initial.
function ownedWhere(scope: AnnonceScope) {
  return scope.admin
    ? { id: scope.id }
    : { id: scope.id, auteurId: scope.actorId }
}

function refresh(annonceId: string) {
  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath(`/annonces/${annonceId}`)
  revalidatePath("/agent/dashboard")
  revalidatePath(`/agent/annonces/${annonceId}`)
  revalidatePath("/favoris")
  revalidatePath("/admin/annonces")
}

export async function updateStatutPublication(annonceId: string, formData: FormData) {
  const scope = await authorizedAnnonce(annonceId)
  const statut = statutSchema.parse(formData.get("statut"))
  await prisma.annonce.update({ where: ownedWhere(scope), data: { statut } })
  refresh(annonceId)
  redirect(`/agent/annonces/${annonceId}?toast=statut_ok`)
}

export async function updateEtatBien(annonceId: string, formData: FormData) {
  const scope = await authorizedAnnonce(annonceId)
  const etat = etatSchema.parse(formData.get("etat"))

  if ((scope.type === "VENTE" && etat === "LOUE") ||
      (scope.type === "LOCATION" && etat === "VENDU")) {
    throw new Error("État incompatible avec le type de transaction.")
  }

  await prisma.annonce.update({ where: ownedWhere(scope), data: { etat } })
  refresh(annonceId)
  redirect(`/agent/annonces/${annonceId}?toast=etat_ok`)
}

const uploadDir = path.join(process.cwd(), "public", "annonces", "uploads")
const trashDir = path.join(uploadDir, ".trash")

// Pas de suppression physique des images du seed, des anciens chemins ou de hero.jpg.
const generatedUpload = /^\/annonces\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

type StagedFile = { original: string; staged: string }

async function restoreStaged(items: StagedFile[]) {
  for (const item of [...items].reverse()) {
    try {
      await rename(item.staged, item.original)
    } catch (error) {
      console.error("Impossible de restaurer une photo :", item.original, error)
    }
  }
}

async function permanentlyRemove(items: StagedFile[]) {
  for (const item of items) {
    try {
      await unlink(item.staged)
    } catch (error) {
      console.error("Photo en attente de nettoyage :", item.staged, error)
    }
  }
}

// Les références utilisées ailleurs et les images du seed ne sont jamais déplacées.
async function stageRemovable(urls: string[], annonceId: string): Promise<StagedFile[]> {
  const staged: StagedFile[] = []
  try {
    for (const url of new Set(urls)) {
      if (!generatedUpload.test(url)) continue
      const otherUses = await prisma.photo.count({
        where: { url, annonceId: { not: annonceId } },
      })
      if (otherUses > 0) continue

      const original = path.join(uploadDir, path.basename(url))
      const destination = path.join(trashDir, `${randomUUID()}-${path.basename(url)}`)
      await mkdir(trashDir, { recursive: true })
      try {
        await rename(original, destination)
        staged.push({ original, staged: destination })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      }
    }
    return staged
  } catch (error) {
    await restoreStaged(staged)
    throw error
  }
}

export async function deleteAnnonce(annonceId: string) {
  const scope = await authorizedAnnonce(annonceId)
  const photos = await prisma.photo.findMany({
    where: { annonceId: scope.id },
    select: { url: true },
  })

  const staged = await stageRemovable(photos.map((photo) => photo.url), scope.id)
  try {
    // Prisma supprime aussi les Photo, Favori et Question par cascade.
    await prisma.annonce.delete({ where: ownedWhere(scope) })
  } catch (error) {
    await restoreStaged(staged)
    throw error
  }
  await permanentlyRemove(staged)
  refresh(annonceId)
  redirect("/agent/dashboard?toast=delete_ok")
}

type NewPhoto = { url: string; buffer: Buffer }

// Signature réelle du contenu + MIME ; l'extension envoyée par le navigateur ne suffit pas.
function detectImageExtension(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg"
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png"
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp"
  return null
}

async function validateNewPhotos(formData: FormData): Promise<NewPhoto[]> {
  const entries = formData.getAll("newPhotos").filter((item) => !(typeof item === "string" && item.length === 0))
  if (entries.length > 10) throw new Error("10 nouvelles photos maximum.")

  const result: NewPhoto[] = []
  let totalBytes = 0
  for (const item of entries) {
    if (!(item instanceof File)) throw new Error("Fichier photo invalide.")
    if (item.size === 0) continue
    if (item.size > 5 * 1024 * 1024) throw new Error("Photo de plus de 5 Mo.")
    totalBytes += item.size
    if (totalBytes > 30 * 1024 * 1024) throw new Error("Photos trop volumineuses.")

    const buffer = Buffer.from(await item.arrayBuffer())
    const extension = detectImageExtension(buffer)
    const mimeForExtension = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const
    if (!extension || item.type !== mimeForExtension[extension]) {
      throw new Error("Format de photo interdit : JPEG, PNG ou WebP uniquement.")
    }
    result.push({ url: `/annonces/uploads/${randomUUID()}.${extension}`, buffer })
  }
  return result
}

export async function updateAnnonce(annonceId: string, formData: FormData) {
  const scope = await authorizedAnnonce(annonceId)

  const data = annonceSchema.parse({
    titre: formData.get("titre"),
    description: formData.get("description"),
    ville: formData.get("ville"),
    prix: formData.get("prix"),
    surface: formData.get("surface"),
    chambres: formData.get("chambres"),
    type: formData.get("type"),
    typePropriete: formData.get("typePropriete"),
    dateDisponibilite: formData.get("dateDisponibilite"),
  })

  const ids = z.array(idSchema).max(30).parse(formData.getAll("deletePhotos"))
  const uniqueIds = [...new Set(ids)]
  const photos = uniqueIds.length
    ? await prisma.photo.findMany({
        where: { id: { in: uniqueIds }, annonceId: scope.id },
        select: { id: true, url: true },
      })
    : []
  if (photos.length !== uniqueIds.length) throw new Error("Photo non autorisée ou introuvable.")

  const newPhotos = await validateNewPhotos(formData)
  const createdPaths: string[] = []
  let staged: StagedFile[] = []

  try {
    await mkdir(uploadDir, { recursive: true })
    for (const photo of newPhotos) {
      const filePath = path.join(uploadDir, path.basename(photo.url))
      await writeFile(filePath, photo.buffer, { flag: "wx" })
      createdPaths.push(filePath)
    }

    staged = await stageRemovable(photos.map((photo) => photo.url), scope.id)

    // BDD atomique : aucune modification partielle de l'annonce et de ses photos.
    await prisma.$transaction(async (tx) => {
      await tx.annonce.update({
        where: ownedWhere(scope),
        data: {
          ...data,
          // Un changement vente/location réinitialise un état devenu incompatible.
          ...(data.type !== scope.type ? { etat: "DISPONIBLE" as const } : {}),
        },
      })
      if (uniqueIds.length) {
        await tx.photo.deleteMany({ where: { annonceId: scope.id, id: { in: uniqueIds } } })
      }
      if (newPhotos.length) {
        await tx.photo.createMany({
          data: newPhotos.map((photo) => ({ annonceId: scope.id, url: photo.url })),
        })
      }
    })
  } catch (error) {
    await restoreStaged(staged)
    for (const filePath of createdPaths) {
      try { await unlink(filePath) } catch (cleanupError) {
        console.error("Fichier temporaire non supprimé :", filePath, cleanupError)
      }
    }
    throw error
  }

  await permanentlyRemove(staged)
  refresh(annonceId)
  redirect(`/agent/annonces/${annonceId}?toast=updated`)
}
