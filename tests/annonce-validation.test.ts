
import { describe, expect, it } from "vitest"

import { createAnnonceSchema } from
  "../src/lib/validators/annonce"

const annonceValide = {
  titre: "Appartement lumineux à Paris",
  description:
    "Appartement moderne avec balcon et parking.",
  type: "VENTE",
  typePropriete: "APPARTEMENT",
  prix: "250000",
  dateDisponibilite: "2026-11-01",
  ville: "Paris",
  surface: "75",
  chambres: "2",
}

describe("Validation Zod des annonces", () => {
  it("accepte une annonce valide", () => {
    const result = createAnnonceSchema.safeParse(
      annonceValide,
    )

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.prix).toBe(250000)
      expect(result.data.surface).toBe(75)
      expect(result.data.chambres).toBe(2)
      expect(
        result.data.dateDisponibilite,
      ).toBeInstanceOf(Date)
    }
  })

  it("accepte une annonce en location", () => {
    const result = createAnnonceSchema.safeParse({
      ...annonceValide,
      type: "LOCATION",
      prix: "850",
      typePropriete: "STUDIO",
    })

    expect(result.success).toBe(true)
  })

  it("accepte un bien avec zéro chambre", () => {
    const result = createAnnonceSchema.safeParse({
      ...annonceValide,
      chambres: "0",
    })

    expect(result.success).toBe(true)
  })

  it("supprime les espaces autour du titre", () => {
    const result = createAnnonceSchema.safeParse({
      ...annonceValide,
      titre: "   Appartement lumineux   ",
    })

    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.titre).toBe(
        "Appartement lumineux",
      )
    }
  })

  const casInvalides: {
    nom: string
    champ: keyof typeof annonceValide
    valeur: unknown
  }[] = [
    {
      nom: "refuse un titre trop court",
      champ: "titre",
      valeur: "Abc",
    },
    {
      nom: "refuse un titre de plus de 150 caractères",
      champ: "titre",
      valeur: "A".repeat(151),
    },
    {
      nom: "refuse une description trop courte",
      champ: "description",
      valeur: "Trop courte",
    },
    {
      nom: "refuse un type de transaction inconnu",
      champ: "type",
      valeur: "ACHAT",
    },
    {
      nom: "refuse un type de propriété inconnu",
      champ: "typePropriete",
      valeur: "TERRAIN",
    },
    {
      nom: "refuse un prix négatif",
      champ: "prix",
      valeur: "-100",
    },
    {
      nom: "refuse un prix égal à zéro",
      champ: "prix",
      valeur: "0",
    },
    {
      nom: "refuse un prix non numérique",
      champ: "prix",
      valeur: "abc",
    },
    {
      nom: "refuse une date invalide",
      champ: "dateDisponibilite",
      valeur: "date-invalide",
    },
    {
      nom: "refuse une ville trop courte",
      champ: "ville",
      valeur: "A",
    },
    {
      nom: "refuse une surface négative",
      champ: "surface",
      valeur: "-20",
    },
    {
      nom: "refuse une surface décimale",
      champ: "surface",
      valeur: "45.5",
    },
    {
      nom: "refuse zéro mètre carré",
      champ: "surface",
      valeur: "0",
    },
    {
      nom: "refuse un nombre de chambres négatif",
      champ: "chambres",
      valeur: "-1",
    },
    {
      nom: "refuse un nombre de chambres décimal",
      champ: "chambres",
      valeur: "2.5",
    },
  ]

  it.each(casInvalides)(
    "$nom",
    ({ champ, valeur }) => {
      const result = createAnnonceSchema.safeParse({
        ...annonceValide,
        [champ]: valeur,
      })

      expect(result.success).toBe(false)

      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) => issue.path[0] === champ,
          ),
        ).toBe(true)
      }
    },
  )

  it("refuse une annonce sans titre", () => {
    const result = createAnnonceSchema.safeParse({
      ...annonceValide,
      titre: undefined,
    })

    expect(result.success).toBe(false)
  })

  it("affiche une erreur explicite pour le prix négatif", () => {
    const result = createAnnonceSchema.safeParse({
      ...annonceValide,
      prix: "-50",
    })

    expect(result.success).toBe(false)

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === "prix" &&
            issue.message ===
              "Le prix doit être supérieur à 0",
        ),
      ).toBe(true)
    }
  })

  it("refuse un champ chambres vide", () => {
    const result = createAnnonceSchema.safeParse({
      ...annonceValide,
      chambres: "",
    })

    expect(result.success).toBe(false)
  })

})
