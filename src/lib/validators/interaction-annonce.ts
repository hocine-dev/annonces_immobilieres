import { z } from "zod"

export const annonceIdSchema = z
  .string()
  .trim()
  .min(1, "Identifiant manquant.")
  .max(191, "Identifiant invalide.")

export const questionIdSchema = z
  .string()
  .trim()
  .min(1, "Identifiant de question manquant.")
  .max(191, "Identifiant de question invalide.")

export const favoriSchema = z.object({
  annonceId: annonceIdSchema,
})

export const questionSchema = z.object({
  annonceId: annonceIdSchema,

  texte: z
    .string()
    .trim()
    .min(5, "Votre question doit contenir au moins 5 caractères.")
    .max(1000, "Votre question est trop longue."),
})

export const reponseQuestionSchema = z.object({
  questionId: questionIdSchema,

  reponse: z
    .string()
    .trim()
    .min(2, "La réponse doit contenir au moins 2 caractères.")
    .max(2000, "La réponse est trop longue."),
})