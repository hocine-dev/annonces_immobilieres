import { z } from "zod"

const optionalNumber = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined
    }

    return value
  },
  z.coerce
    .number()
    .nonnegative("Le prix doit être positif.")
    .optional(),
)

const optionalType = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined
    }

    return value
  },
  z.enum(["VENTE", "LOCATION"]).optional(),
)

const optionalVille = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined
    }

    return value
  },
  z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),
)

export const searchAnnonceSchema = z
  .object({
    ville: optionalVille,
    type: optionalType,
    prixMin: optionalNumber,
    prixMax: optionalNumber,
  })
  .refine(
    (data) => {
      if (
        data.prixMin !== undefined &&
        data.prixMax !== undefined
      ) {
        return data.prixMin <= data.prixMax
      }

      return true
    },
    {
      path: ["prixMax"],
      message:
        "Le prix maximum doit être supérieur au prix minimum.",
    },
  )