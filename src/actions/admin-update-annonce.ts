
"use server"

import { MAX_PHOTOS, photosSchema } from "@/lib/validators/photo"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  uploadAnnoncePhoto,
  deleteAnnoncePhoto,
} from "@/lib/photo-storage"
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

  // 8. PHOTOS : SUPABASE STORAGE

  const uploadedUrls: string[] = []

  const deletedPhotos = existing.photos.filter(
    (photo) => removeIds.includes(photo.id),
  )

  try {
    // 1. Envoyer les nouvelles photos dans Supabase Storage.
    for (const photo of newPhotos) {
      const url = await uploadAnnoncePhoto(photo)
      uploadedUrls.push(url)
    }

    // 2. Enregistrer les modifications dans PostgreSQL.
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
          removeIds.length || uploadedUrls.length
            ? {
                deleteMany: removeIds.length
                  ? { id: { in: removeIds } }
                  : undefined,
                create: uploadedUrls.length
                  ? uploadedUrls.map((url) => ({ url }))
                  : undefined,
              }
            : undefined,
      },
    })
  } catch (error) {
    console.error("Erreur de modification d'annonce :", error)

    // En cas d'échec, nettoyer les nouveaux fichiers.
    // Les anciennes photos restent intactes.
    const cleanup = await Promise.allSettled(
      uploadedUrls.map((url) => deleteAnnoncePhoto(url)),
    )

    cleanup.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Échec du nettoyage Supabase :", result.reason)
      }
    })

    return {
      success: false,
      message: "Impossible d'enregistrer les modifications ou les photos.",
      values,
    }
  }

  // 3. Après la mise à jour Prisma, supprimer les fichiers
  // retirés qui ne sont utilisés par aucune autre annonce.
  for (const photo of deletedPhotos) {
    try {
      const otherUses = await prisma.photo.count({
        where: { url: photo.url },
      })

      if (otherUses === 0) {
        await deleteAnnoncePhoto(photo.url)
      }
    } catch (error) {
      // La modification en base a déjà réussi.
      // On journalise l'erreur sans annuler l'annonce.
      console.error("Nettoyage de photo à reprendre :", error)
    }
  }

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
