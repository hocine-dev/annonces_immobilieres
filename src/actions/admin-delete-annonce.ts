
"use server"

import { randomUUID } from "node:crypto"
import { mkdir, rename, unlink } from "node:fs/promises"
import path from "node:path"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { annonceIdSchema } from "@/lib/validators/interaction-annonce"

export type AdminDeleteState = {
  error: string
}

type StagedFile = {
  original: string
  staged: string
}

const uploadPattern =
  /^\/annonces\/uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i

async function restoreFiles(files: StagedFile[]) {
  const results = await Promise.allSettled(
    files.map(({ original, staged }) =>
      rename(staged, original),
    ),
  )

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        "Impossible de restaurer une photo :",
        files[index].staged,
        result.reason,
      )
    }
  })
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

  // 2. Autorisation
  if (session.user.role !== "ADMIN") {
    return { error: "Action non autorisée." }
  }

  // 3. Validation
  const parsedId = annonceIdSchema.safeParse(
    formData.get("annonceId"),
  )

  if (!parsedId.success) {
    return { error: "Annonce invalide." }
  }

  // 4. Récupération des photos
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

  const publicDirectory = path.join(
    process.cwd(),
    "public",
  )

  const trashDirectory = path.join(
    process.cwd(),
    ".photo-trash",
  )

  const stagedFiles: StagedFile[] = []

  // 5. Préparer les fichiers uploadés pour suppression
  try {
    for (const photo of annonce.photos) {
      // Ne supprimer physiquement que les uploads UUID, jamais les images du seed.
      if (!uploadPattern.test(photo.url)) {
        continue
      }

      // Une photo partagée par une autre annonce doit rester sur le disque.
      const otherUses = await prisma.photo.count({
        where: { url: photo.url, annonceId: { not: annonce.id } },
      })
      if (otherUses > 0) continue

      const original = path.join(
        publicDirectory,
        photo.url.slice(1),
      )

      const staged = path.join(
        trashDirectory,
        `${randomUUID()}-${path.basename(original)}`,
      )

      await mkdir(trashDirectory, {
        recursive: true,
      })

      try {
        await rename(original, staged)
        stagedFiles.push({ original, staged })
      } catch (error) {
        // Le fichier peut déjà être absent du disque.
        if (
          (error as NodeJS.ErrnoException).code !== "ENOENT"
        ) {
          throw error
        }
      }
    }

    // 6. Suppression en base de données.
    // Les relations Photo, Question et Favori
    // sont supprimées par cascade.
    await prisma.annonce.delete({
      where: { id: annonce.id },
    })
  } catch (error) {
    console.error("Échec de suppression d'annonce :", error)

    await restoreFiles(stagedFiles)

    return {
      error: "Impossible de supprimer cette annonce.",
    }
  }

  // 7. Effacement définitif des fichiers préparés
  const cleanup = await Promise.allSettled(
    stagedFiles.map(({ staged }) => unlink(staged)),
  )

  let cleanupFailed = false

  cleanup.forEach((result, index) => {
    if (result.status === "rejected") {
      cleanupFailed = true
      console.error(
        "Nettoyage de photo échoué :",
        stagedFiles[index].staged,
        result.reason,
      )
    }
  })

  // 8. Actualisation des pages
  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath(`/annonces/${annonce.id}`)
  revalidatePath("/admin/annonces")
  revalidatePath("/admin/dashboard")
  revalidatePath("/agent/dashboard")
  revalidatePath("/dashboard")

  // Retour à la liste avec confirmation.
  redirect(
    cleanupFailed
      ? "/admin/annonces?deleted=1&cleanup=1"
      : "/admin/annonces?deleted=1",
  )
}
