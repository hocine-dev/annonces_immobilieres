"use server"

import { z } from "zod"

import { updateAnnonce } from "../actions"

export type UpdateAnnonceState = {
  attempted?: boolean
  message?: string
  errors?: Record<string, string[]>
  values?: Record<string, string>
  selectedPhotoIds?: string[]
}

const fieldNames = [
  "titre", "description", "ville", "prix", "surface", "chambres",
  "type", "typePropriete", "dateDisponibilite",
] as const

function messageValidationFr(champ: string, code: string): string {
  switch (champ) {
    case "titre":
      return code === "too_big"
        ? "Le titre ne doit pas dépasser 160 caractères."
        : "Le titre doit contenir au moins 3 caractères."
    case "description":
      return "La description doit contenir au moins 10 caractères."
    case "ville":
      return code === "too_big"
        ? "Le nom de la ville ne doit pas dépasser 120 caractères."
        : "La ville doit contenir au moins 2 caractères."
    case "prix":
      return code === "too_big"
        ? "Le prix ne doit pas dépasser 999 999 999 €."
        : code === "too_small"
          ? "Le prix doit être supérieur à 0 €."
          : "Saisissez un prix valide, supérieur à 0 €."
    case "surface":
      return code === "too_small"
        ? "La surface doit être supérieure à 0 m²."
        : "Indiquez une surface entière valide, supérieure à 0 m²."
    case "chambres":
      return code === "too_small"
        ? "Le nombre de chambres ne peut pas être négatif."
        : "Indiquez un nombre entier de chambres (0 ou plus)."
    case "type":
      return "Sélectionnez un type d'opération valide : vente ou location."
    case "typePropriete":
      return "Sélectionnez un type de propriété valide."
    case "dateDisponibilite":
      return "Saisissez une date de disponibilité valide."
    case "deletePhotos":
      return "La sélection des photos à supprimer est invalide."
    case "newPhotos":
      return "Les photos sélectionnées sont invalides."
    default:
      return "La valeur saisie est invalide."
  }
}

export async function updateAnnonceAvecRetour(
  annonceId: string,
  _previous: UpdateAnnonceState,
  formData: FormData,
): Promise<UpdateAnnonceState> {
  const values: Record<string, string> = {}
  for (const name of fieldNames) {
    const value = formData.get(name)
    if (typeof value === "string") values[name] = value
  }
  const selectedPhotoIds = formData.getAll("deletePhotos").filter(
    (value): value is string => typeof value === "string",
  )

  try {
    // Cette action conserve TOUS ses contrôles session/rôle/propriété, ses
    // validations Zod et ses opérations Prisma atomiques existantes.
    await updateAnnonce(annonceId, formData)
    return { attempted: false, errors: {}, values: {}, selectedPhotoIds: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {}
      for (const issue of error.issues) {
        const field = String(issue.path[0] ?? "form")
        ;(errors[field] ??= []).push(messageValidationFr(field, issue.code))
      }
      return {
        attempted: true,
        message: "Veuillez corriger les champs indiqués.",
        errors,
        values,
        selectedPhotoIds,
      }
    }

    // Uniquement les échecs de validation connus ; jamais masquer les erreurs
    // d'authentification, de permission, de BDD ou les redirections Next.js.
    if (error instanceof Error) {
      if (/^(10 nouvelles photos maximum|Fichier photo invalide|Photo de plus de 5 Mo|Photos trop volumineuses|Format de photo interdit)/.test(error.message)) {
        return {
          attempted: true,
          message: "Vérifiez les nouvelles photos sélectionnées.",
          errors: { newPhotos: [error.message] },
          values,
          selectedPhotoIds,
        }
      }
      if (error.message === "Photo non autorisée ou introuvable.") {
        return {
          attempted: true,
          errors: { deletePhotos: [error.message] },
          message: "Vérifiez les photos à supprimer.",
          values,
          selectedPhotoIds,
        }
      }
    }
    // redirect(), notFound() et les incidents inattendus doivent remonter.
    throw error
  }
}
