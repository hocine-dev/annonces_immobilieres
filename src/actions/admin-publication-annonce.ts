
"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { annonceIdSchema } from "@/lib/validators/interaction-annonce"

const publicationSchema = z.object({
  annonceId: annonceIdSchema,
  statut: z.enum(["PUBLIE", "BROUILLON"]),
})

export type AdminPublicationState = {
  success: boolean
  message: string
  statut?: "PUBLIE" | "BROUILLON"
}

export async function adminChangePublication(
  _previousState: AdminPublicationState,
  formData: FormData,
): Promise<AdminPublicationState> {
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

  // 2. Autorisation ADMIN
  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Action non autorisée.",
    }
  }

  // 3. Validation Zod
  const parsed = publicationSchema.safeParse({
    annonceId: formData.get("annonceId"),
    statut: formData.get("statut"),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: "Données invalides.",
    }
  }

  const { annonceId, statut } = parsed.data

  // 4. Vérifier l'existence de l'annonce
  const annonce = await prisma.annonce.findUnique({
    where: { id: annonceId },
    select: { id: true },
  })

  if (!annonce) {
    return {
      success: false,
      message: "Annonce introuvable.",
    }
  }

  // 5. Mettre à jour la publication
  try {
    await prisma.annonce.update({
      where: { id: annonceId },
      data: { statut },
    })
  } catch {
    return {
      success: false,
      message: "Impossible de modifier la publication.",
    }
  }

  // 6. Actualiser les pages concernées
  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath(`/annonces/${annonceId}`)
  revalidatePath("/admin/annonces")
  revalidatePath("/admin/dashboard")
  revalidatePath(`/admin/annonces/${annonceId}/edit`)
  revalidatePath("/agent/dashboard")

  return {
    success: true,
    statut,
    message:
      statut === "PUBLIE"
        ? "Annonce publiée avec succès."
        : "Annonce mise en brouillon.",
  }
}
