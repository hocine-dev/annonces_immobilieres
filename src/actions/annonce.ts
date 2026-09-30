"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createAnnonceSchema } from "@/lib/validators/annonce"

export type CreateAnnonceState = {
  success: boolean
  message?: string
  errors?: Record<string, string[] | undefined>
  values?: {
    titre?: string
    description?: string
    type?: string
    typePropriete?: string
    prix?: string
    dateDisponibilite?: string
    ville?: string
    surface?: string
    chambres?: string
  }
  annonceId?: string
}

export async function createAnnonce(
  previousState: CreateAnnonceState,
  formData: FormData,
): Promise<CreateAnnonceState> {
  // 1. AUTHENTIFICATION
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return {
      success: false,
      message: "Vous devez être connecté.",
    }
  }

  // 2. AUTORISATION
  if (
    session.user.role !== "AGENT" &&
    session.user.role !== "ADMIN"
  ) {
    return {
      success: false,
      message: "Vous n'êtes pas autorisé à créer une annonce.",
    }
  }

  // Valeurs brutes du formulaire
  const values = {
    titre: String(formData.get("titre") ?? ""),
    description: String(formData.get("description") ?? ""),
    type: String(formData.get("type") ?? ""),
    typePropriete: String(formData.get("typePropriete") ?? ""),
    prix: String(formData.get("prix") ?? ""),
    dateDisponibilite: String(
      formData.get("dateDisponibilite") ?? "",
    ),
    ville: String(formData.get("ville") ?? ""),
    surface: String(formData.get("surface") ?? ""),
    chambres: String(formData.get("chambres") ?? ""),
  }

  // 3. VALIDATION ZOD
  const result = createAnnonceSchema.safeParse(values)

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
      values,
    }
  }

  // 4. INSERTION PRISMA
  const annonce = await prisma.annonce.create({
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

      auteurId: session.user.id,
    },
  })

  revalidatePath("/annonces")

  return {
    success: true,
    annonceId: annonce.id,
  }
}