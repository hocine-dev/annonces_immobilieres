"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const changeUserRoleSchema = z.object({
  userId: z.string().min(1, "Utilisateur invalide"),
  role: z.enum(["USER", "AGENT"]),
})

export async function changeUserRole(formData: FormData) {
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
  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      message: "Action réservée aux administrateurs.",
    }
  }

  // 3. VALIDATION
  const result = changeUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  })

  if (!result.success) {
    return {
      success: false,
      message: "Données invalides.",
    }
  }

  // On vérifie que l'utilisateur existe
  const user = await prisma.user.findUnique({
    where: {
      id: result.data.userId,
    },
  })

  if (!user) {
    return {
      success: false,
      message: "Utilisateur introuvable.",
    }
  }

  // On évite de modifier les comptes ADMIN depuis cette interface.
  if (user.role === "ADMIN") {
    return {
      success: false,
      message: "Le rôle d'un administrateur ne peut pas être modifié ici.",
    }
  }

  // 4. MUTATION
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: result.data.role,
    },
  })

  revalidatePath("/admin/users")

  return {
    success: true,
  }
}