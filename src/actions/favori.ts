"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { favoriSchema } from "@/lib/validators/interaction-annonce"

export async function toggleFavori(formData: FormData) {
  // 1. Authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return {
      success: false,
      message: "Vous devez être connecté.",
    }
  }

  // 2. Autorisation
  if (
    session.user.role !== "USER" &&
    session.user.role !== "ADMIN"
  ) {
    return {
      success: false,
      message:
        "Cette fonctionnalité est réservée aux utilisateurs.",
    }
  }

  // 3. Validation Zod
  const result = favoriSchema.safeParse({
    annonceId: formData.get("annonceId"),
  })

  if (!result.success) {
    return {
      success: false,
      message: "Annonce invalide.",
    }
  }

  const { annonceId } = result.data

  // L'annonce doit exister et être publique
  const annonce = await prisma.annonce.findFirst({
    where: {
      id: annonceId,
      statut: "PUBLIE",
    },
    select: {
      id: true,
    },
  })

  if (!annonce) {
    return {
      success: false,
      message: "Cette annonce n'existe pas.",
    }
  }

  const existing = await prisma.favori.findUnique({
    where: {
      userId_annonceId: {
        userId: session.user.id,
        annonceId,
      },
    },
  })

  if (existing) {
    await prisma.favori.delete({
      where: {
        id: existing.id,
      },
    })
  } else {
    await prisma.favori.create({
      data: {
        userId: session.user.id,
        annonceId,
      },
    })
  }

  revalidatePath(`/annonces/${annonceId}`)
  revalidatePath("/dashboard")

  return {
    success: true,
    isFavorite: !existing,
  }
}