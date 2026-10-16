
"use server"

import { randomUUID } from "node:crypto"
import { mkdir, rename, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { MAX_PHOTOS, photosSchema } from "@/lib/validators/photo"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createAnnonceSchema } from "@/lib/validators/annonce"
import type { CreateAnnonceState } from "@/actions/annonce"

const annonceIdSchema = z.string().min(1).max(128)

export async function adminUpdateAnnonce(
  annonceId: string,
  _previousState: CreateAnnonceState,
  formData: FormData,
): Promise<CreateAnnonceState> {
  // 1. Authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return {
      success: false,
      message: "Vous devez être connecté.",
    }
  }

  // 2. Autorisation : ADMIN uniquement
  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Action réservée aux administrateurs.",
    }
  }

  // 3. Validation de l'identifiant
  const parsedId = annonceIdSchema.safeParse(annonceId)

  if (!parsedId.success) {
    return {
      success: false,
      message: "Identifiant d'annonce invalide.",
    }
  }

  // 4. Récupération des valeurs
  const values = {
    titre: String(formData.get("titre") ?? ""),
    description: String(formData.get("description") ?? ""),
    type: String(formData.get("type") ?? ""),
    typePropriete: String(
      formData.get("typePropriete") ?? "",
    ),
    prix: String(formData.get("prix") ?? ""),
    dateDisponibilite: String(
      formData.get("dateDisponibilite") ?? "",
    ),
    ville: String(formData.get("ville") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    chambres: String(formData.get("chambres") ?? ""),
  }

  // 5. Validation Zod commune à la création
  const result = createAnnonceSchema.safeParse(values)

  if (!result.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs indiqués.",
      errors: result.error.flatten().fieldErrors,
      values,
    }
  }

  // 6. Vérification de l'existence
  const existing = await prisma.annonce.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      photos: {
        select: { id: true, url: true },
      },
    },
  })

  if (!existing) {
    return {
      success: false,
      message: "Annonce introuvable.",
      values,
    }
  }

  // 7. Photos à ajouter et à supprimer
  const newPhotos = formData
    .getAll("photos")
    .filter(
      (value): value is File =>
        value instanceof File && value.size > 0,
    )

  const photosValidation = photosSchema.safeParse(
    newPhotos.map((photo) => ({
      name: photo.name,
      type: photo.type,
      size: photo.size,
    })),
  )

  if (!photosValidation.success) {
    return {
      success: false,
      message: "Veuillez vérifier les nouvelles photos.",
      errors: {
        photos: photosValidation.error.issues.map(
          (issue) => issue.message,
        ),
      },
      values,
    }
  }

  const rawRemovalIds = formData.getAll("removePhotoIds")

  if (rawRemovalIds.some((id) => typeof id !== "string")) {
    return {
      success: false,
      message: "Sélection de photos invalide.",
      values,
    }
  }

  const removeIds = [...new Set(rawRemovalIds as string[])]

  const existingIds = new Set(
    existing.photos.map((photo) => photo.id),
  )

  if (removeIds.some((id) => !existingIds.has(id))) {
    return {
      success: false,
      message: "Une photo sélectionnée ne fait pas partie de cette annonce.",
      values,
    }
  }

  const finalPhotoCount =
    existing.photos.length - removeIds.length + newPhotos.length

  if (finalPhotoCount > MAX_PHOTOS) {
    return {
      success: false,
      message: `Une annonce ne peut pas dépasser ${MAX_PHOTOS} photos.`,
      errors: {
        photos: [`Maximum ${MAX_PHOTOS} photos au total.`],
      },
      values,
    }
  }

  const directory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "annonces",
  )

  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }

  const writtenFiles: string[] = []
  const newUrls: string[] = []

  const deletedPhotos = existing.photos.filter(
    (photo) => removeIds.includes(photo.id),
  )

  const trashDirectory = path.join(
    process.cwd(),
    ".photo-trash",
  )

  const movedFiles: {
    original: string
    staged: string
  }[] = []

  // 8. Enregistrement des nouvelles photos
  // puis mise à jour atomique des données Prisma.
  try {
    // Déplacer les fichiers concernés hors du dossier public.
    if (deletedPhotos.length > 0) {
      await mkdir(trashDirectory, { recursive: true })

      for (const photo of deletedPhotos) {
        const prefix = "/uploads/annonces/"
        const filename = photo.url.startsWith(prefix)
          ? photo.url.slice(prefix.length)
          : ""

        if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(filename)) {
          continue
        }

        const original = path.join(directory, filename)
        const staged = path.join(
          trashDirectory,
          `${randomUUID()}-${filename}`,
        )

        try {
          await rename(original, staged)
          movedFiles.push({ original, staged })
        } catch (error) {
          if (
            (error as NodeJS.ErrnoException).code !== "ENOENT"
          ) {
            throw error
          }
        }
      }
    }

    if (newPhotos.length > 0) {
      await mkdir(directory, { recursive: true })
    }

    for (const photo of newPhotos) {
      const extension = extensions[photo.type]

      if (!extension) {
        throw new Error("Format de photo invalide")
      }

      const filename = `${randomUUID()}.${extension}`
      const absolutePath = path.join(directory, filename)

      await writeFile(
        absolutePath,
        Buffer.from(await photo.arrayBuffer()),
      )

      writtenFiles.push(absolutePath)
      newUrls.push(`/uploads/annonces/${filename}`)
    }

    await prisma.annonce.update({
      where: { id: existing.id },
      data: {
        titre: result.data.titre,
        description: result.data.description,
        type: result.data.type,
        typePropriete: result.data.typePropriete,
        prix: result.data.prix,
        dateDisponibilite: result.data.dateDisponibilite,
        ville: result.data.ville,
        surface: result.data.surface,
        chambres: result.data.chambres,
        photos:
          removeIds.length || newUrls.length
            ? {
                deleteMany: removeIds.length
                  ? { id: { in: removeIds } }
                  : undefined,
                create: newUrls.length
                  ? newUrls.map((url) => ({ url }))
                  : undefined,
              }
            : undefined,
      },
    })
  } catch (error) {
    console.error("Erreur de modification d'annonce :", error)

    // Restaurer les photos si la sauvegarde a échoué.
    const restoration = await Promise.allSettled(
      movedFiles.map(({ original, staged }) =>
        rename(staged, original),
      ),
    )

    restoration.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          "Restauration de photo échouée :",
          movedFiles[index].staged,
          result.reason,
        )
      }
    })

    await Promise.allSettled(
      writtenFiles.map((file) => unlink(file)),
    )

    return {
      success: false,
      message: "Impossible d'enregistrer les modifications ou les photos.",
      values,
    }
  }

  // Nettoyage définitif après confirmation en base.
  const cleanup = await Promise.allSettled(
    movedFiles.map(({ staged }) => unlink(staged)),
  )

  cleanup.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        "Nettoyage de photo à reprendre :",
        movedFiles[index].staged,
        result.reason,
      )
    }
  })

  // 8. Actualisation des pages
  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath(`/annonces/${existing.id}`)
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/annonces")
  revalidatePath(`/admin/annonces/${existing.id}/edit`)
  revalidatePath("/agent/dashboard")

  return {
    success: true,
    message: "Annonce modifiée avec succès.",
    annonceId: existing.id,
    values,
  }
}
