import { z } from "zod"

export const createAnnonceSchema = z.object({
  titre: z
    .string()
    .trim()
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(150, "Le titre est trop long"),

  description: z
    .string()
    .trim()
    .min(20, "La description doit contenir au moins 20 caractères"),

  type: z.enum(["VENTE", "LOCATION"]),

  typePropriete: z.enum([
    "APPARTEMENT",
    "MAISON",
    "VILLA",
    "STUDIO",
    "LOFT",
  ]),

  prix: z.coerce
    .number()
    .positive("Le prix doit être supérieur à 0"),

  dateDisponibilite: z.coerce.date(),

  ville: z
    .string()
    .trim()
    .min(2, "La ville doit contenir au moins 2 caractères"),

  surface: z.coerce
    .number()
    .int("La surface doit être un entier")
    .positive("La surface doit être supérieure à 0"),

  chambres: z.coerce
    .number()
    .int("Le nombre de chambres doit être un entier")
    .min(0, "Le nombre de chambres ne peut pas être négatif"),
})

export type CreateAnnonceInput = z.infer<typeof createAnnonceSchema>