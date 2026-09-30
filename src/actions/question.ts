"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import {
  questionSchema,
  reponseQuestionSchema,
} from "@/lib/validators/interaction-annonce"

export type QuestionState = {
  success: boolean
  message?: string

  errors?: {
    texte?: string[]
  }

  values?: {
    texte?: string
  }
}

export type ReponseQuestionState = {
  success: boolean
  message?: string

  errors?: {
    reponse?: string[]
  }

  values?: {
    reponse?: string
  }
}

/*
 * USER / ADMIN
 * Pose une question sur une annonce.
 */
export async function poserQuestion(
  previousState: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  // 1. Authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return {
      success: false,
      message: "Vous devez être connecté pour poser une question.",
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

  const texte = String(formData.get("texte") ?? "")
  const annonceId = String(
    formData.get("annonceId") ?? "",
  )

  // 3. Validation Zod
  const result = questionSchema.safeParse({
    annonceId,
    texte,
  })

  if (!result.success) {
    return {
      success: false,

      errors: result.error.flatten().fieldErrors,

      values: {
        texte,
      },
    }
  }

  const annonce = await prisma.annonce.findFirst({
    where: {
      id: result.data.annonceId,
      statut: "PUBLIE",
    },

    select: {
      id: true,
    },
  })

  if (!annonce) {
    return {
      success: false,
      message: "Cette annonce n'est plus disponible.",

      values: {
        texte,
      },
    }
  }

  await prisma.question.create({
    data: {
      texte: result.data.texte,
      auteurId: session.user.id,
      annonceId: result.data.annonceId,
    },
  })

  revalidatePath(
    `/annonces/${result.data.annonceId}`,
  )

  return {
    success: true,
    message: "Votre question a bien été envoyée.",
  }
}

/*
 * AGENT propriétaire / ADMIN
 * Répond à une question.
 */
export async function repondreQuestion(
  previousState: ReponseQuestionState,
  formData: FormData,
): Promise<ReponseQuestionState> {
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

  // 2. Autorisation générale
  if (
    session.user.role !== "AGENT" &&
    session.user.role !== "ADMIN"
  ) {
    return {
      success: false,
      message:
        "Vous n'êtes pas autorisé à répondre aux questions.",
    }
  }

  const questionId = String(
    formData.get("questionId") ?? "",
  )

  const reponse = String(
    formData.get("reponse") ?? "",
  )

  // 3. Validation Zod
  const result = reponseQuestionSchema.safeParse({
    questionId,
    reponse,
  })

  if (!result.success) {
    return {
      success: false,

      errors: result.error.flatten().fieldErrors,

      values: {
        reponse,
      },
    }
  }

  /*
   * On récupère la question ET le propriétaire
   * de l'annonce.
   */
  const question = await prisma.question.findUnique({
    where: {
      id: result.data.questionId,
    },

    select: {
      id: true,
      annonceId: true,

      annonce: {
        select: {
          auteurId: true,
        },
      },
    },
  })

  if (!question) {
    return {
      success: false,
      message: "Cette question n'existe pas.",
    }
  }

  /*
   * Protection contre l'IDOR :
   *
   * AGENT :
   *   l'annonce doit lui appartenir.
   *
   * ADMIN :
   *   tous les droits.
   */
  if (
    session.user.role !== "ADMIN" &&
    question.annonce.auteurId !== session.user.id
  ) {
    return {
      success: false,
      message:
        "Vous n'êtes pas autorisé à répondre à cette question.",
    }
  }

  await prisma.question.update({
    where: {
      id: question.id,
    },

    data: {
      reponse: result.data.reponse,
    },
  })

  /*
   * Actualisation des différents endroits
   * pouvant afficher cette réponse.
   */
  revalidatePath("/agent/questions")
  revalidatePath("/agent/dashboard")

  revalidatePath(
    `/annonces/${question.annonceId}`,
  )

  return {
    success: true,

    message: "Votre réponse a bien été enregistrée.",

    values: {
      reponse: result.data.reponse,
    },
  }
}