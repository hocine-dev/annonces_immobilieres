"use server"

import { randomUUID } from "node:crypto"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createAnnonceSchema } from "@/lib/validators/annonce"
import { photosSchema } from "@/lib/validators/photo"

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

  const photoFiles = formData
    .getAll("photos")
    .filter(
      (value): value is File =>
        value instanceof File && value.size > 0,
    )

  // 3. VALIDATION ZOD
  const result = createAnnonceSchema.safeParse(values)

  const photosResult = photosSchema.safeParse(
    photoFiles.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    })),
  )

  if (!result.success || !photosResult.success) {
    return {
      success: false,
      errors: {
        ...(result.success
          ? {}
          : result.error.flatten().fieldErrors),

        ...(photosResult.success
          ? {}
          : {
              photos: photosResult.error.issues.map(
                (issue) => issue.message,
              ),
            }),
      },
      values,
    }
  }

  // 4. SAUVEGARDE DES PHOTOS
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "annonces",
    "uploads",
  )

  await mkdir(uploadDirectory, {
    recursive: true,
  })

  const extensionByMimeType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  }

  const writtenFiles: string[] = []
  const photoUrls: string[] = []

  try {
    for (const photo of photoFiles) {
      const extension = extensionByMimeType[photo.type]

      if (!extension) {
        throw new Error("Type d'image non autorisé")
      }

      const filename = `${randomUUID()}.${extension}`

      const absolutePath = path.join(
        uploadDirectory,
        filename,
      )

      const buffer = Buffer.from(
        await photo.arrayBuffer(),
      )

      await writeFile(
        absolutePath,
        buffer,
      )

      writtenFiles.push(absolutePath)

      photoUrls.push(
        `/annonces/uploads/${filename}`,
      )
    }
  } catch {
    await Promise.allSettled(
      writtenFiles.map((filename) =>
        unlink(filename),
      ),
    )

    return {
      success: false,
      message:
        "Une erreur est survenue pendant l'enregistrement des photos.",
      values,
    }
  }

  // 5. INSERTION PRISMA
  let annonce

  try {
    annonce = await prisma.annonce.create({
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

        photos:
          photoUrls.length > 0
            ? {
                create: photoUrls.map((url) => ({
                  url,
                })),
              }
            : undefined,
      },
    })
  } catch {
    await Promise.allSettled(
      writtenFiles.map((filename) =>
        unlink(filename),
      ),
    )

    return {
      success: false,
      message:
        "Une erreur est survenue pendant la création de l'annonce.",
      values,
    }
  }

  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath("/agent")
  revalidatePath("/agent/dashboard")

  return {
    success: true,
    annonceId: annonce.id,
  }
}