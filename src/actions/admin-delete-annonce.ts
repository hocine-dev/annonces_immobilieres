"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteAnnoncePhoto } from "@/lib/photo-storage"
import { annonceIdSchema } from "@/lib/validators/interaction-annonce"

export type AdminDeleteState = {
  error: string
}

export async function adminDeleteAnnonce(
  _previousState: AdminDeleteState,
  formData: FormData,
): Promise<AdminDeleteState> {
  // 1. Authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return { error: "Vous devez être connecté." }
  }

  // 2. Autorisation : administrateur uniquement
  if (session.user.role !== "ADMIN") {
    return { error: "Action non autorisée." }
  }

  // 3. Validation de l'identifiant
  const parsedId = annonceIdSchema.safeParse(
    formData.get("annonceId"),
  )

  if (!parsedId.success) {
    return { error: "Annonce invalide." }
  }

  // 4. Récupérer les photos avant la suppression
  const annonce = await prisma.annonce.findUnique({
    where: { id: parsedId.data },
    select: {
      id: true,
      photos: {
        select: { url: true },
      },
    },
  })

  if (!annonce) {
    return { error: "Annonce introuvable." }
  }

  // 5. Supprimer l'annonce en base de données
  try {
    await prisma.annonce.delete({
      where: { id: annonce.id },
    })
    // Les relations Photo, Question et Favori
    // restent supprimées par cascade.
  } catch (error) {
    console.error("Échec de suppression d'annonce :", error)

    return {
      error: "Impossible de supprimer cette annonce.",
    }
  }

  // 6. Supprimer les photos Supabase devenues inutilisées
  let cleanupFailed = false

  const urls = new Set(
    annonce.photos.map((photo) => photo.url),
  )

  for (const url of urls) {
    try {
      // Une autre annonce peut utiliser la même photo.
      const references = await prisma.photo.count({
        where: { url },
      })

      if (references === 0) {
        await deleteAnnoncePhoto(url)
      }
    } catch (error) {
      cleanupFailed = true
      console.error("Nettoyage photo échoué :", error)
    }
  }

  // 7. Actualisation des pages
  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath(`/annonces/${annonce.id}`)
  revalidatePath("/admin/annonces")
  revalidatePath("/admin/dashboard")
  revalidatePath("/agent/dashboard")
  revalidatePath("/dashboard")

  // 8. Redirection
  redirect(
    cleanupFailed
      ? "/admin/annonces?deleted=1&cleanup=1"
      : "/admin/annonces?deleted=1",
  )
}
