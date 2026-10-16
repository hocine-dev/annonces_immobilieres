
"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { annonceIdSchema } from "@/lib/validators/interaction-annonce"

const etatAnnonceSchema = z.object({
  annonceId: annonceIdSchema,
  etat: z.enum(["DISPONIBLE", "LOUE", "VENDU"]),
})

export type AdminEtatState = {
  success: boolean
  message: string
  etat?: "DISPONIBLE" | "LOUE" | "VENDU"
}

export async function adminChangeEtat(
  _previousState: AdminEtatState,
  formData: FormData,
): Promise<AdminEtatState> {
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

  // 2. Autorisation
  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Action non autorisée.",
    }
  }

  // 3. Validation Zod
  const parsed = etatAnnonceSchema.safeParse({
    annonceId: formData.get("annonceId"),
    etat: formData.get("etat"),
  })

  if (!parsed.success) {
    return {
      success: false,
      message: "Données invalides.",
    }
  }

  const { annonceId, etat } = parsed.data

  // 4. Récupérer le type réel de l'annonce
  const annonce = await prisma.annonce.findUnique({
    where: { id: annonceId },
    select: {
      id: true,
      type: true,
    },
  })

  if (!annonce) {
    return {
      success: false,
      message: "Annonce introuvable.",
    }
  }

  // 5. Vérifier les règles métier
  if (annonce.type === "VENTE" && etat === "LOUE") {
    return {
      success: false,
      message:
        "Un bien en vente ne peut pas être loué.",
    }
  }

  if (annonce.type === "LOCATION" && etat === "VENDU") {
    return {
      success: false,
      message:
        "Un bien en location ne peut pas être vendu.",
    }
  }

  // 6. Enregistrer le nouvel état
  try {
    const result = await prisma.annonce.updateMany({
      where: {
        id: annonce.id,
        type: annonce.type,
      },
      data: {
        etat,
      },
    })

    if (result.count !== 1) {
      return {
        success: false,
        message:
          "L'annonce a été modifiée entre-temps. Réessayez.",
      }
    }
  } catch {
    return {
      success: false,
      message:
        "Impossible de modifier l'état du bien.",
    }
  }

  // 7. Actualisation des pages
  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath(`/annonces/${annonceId}`)
  revalidatePath("/admin/annonces")
  revalidatePath("/admin/dashboard")
  revalidatePath(`/admin/annonces/${annonceId}/edit`)
  revalidatePath("/agent/dashboard")

  return {
    success: true,
    etat,
    message: "État du bien mis à jour.",
  }
}
