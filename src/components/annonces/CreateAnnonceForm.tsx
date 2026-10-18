"use client"

import { useActionState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Euro,
  FileText,
  Home,
  MapPin,
  Ruler,
  BedDouble,
} from "lucide-react"

import {
  createAnnonce,
  type CreateAnnonceState,
} from "@/actions/annonce"

import { PhotoDropzone } from "@/components/annonces/PhotoDropzone"
import { adminUpdateAnnonce } from "@/actions/admin-update-annonce"

type AnnonceFormValues = NonNullable<CreateAnnonceState["values"]>

type Props = {
  mode?: "create" | "edit"
  annonceId?: string
  initialValues?: AnnonceFormValues
  existingPhotos?: { id: string; url: string }[]
}

const inputClass =
  "h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"

const inputWithIconClass =
  "h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"

const labelClass =
  "mb-2 block text-sm font-semibold text-foreground"

// Présentation uniquement : ne modifie pas les règles Zod côté serveur.
function adminErreurEnFrancais(champ: string, erreur: string): string {
  // Les messages déjà rédigés en français sont conservés.
  if (/^(Le |La |Les |L'|Une |Un |Veuillez |Saisissez |Indiquez |Sélectionnez |Choisissez |Ce |Cette |Vous |Impossible |Format |Fichier |Photo |Au moins |Trop )/i.test(erreur)) {
    return erreur
  }
  const traduction: Record<string, string> = {
    titre: "Saisissez un titre valide et suffisamment long.",
    description: "La description est trop courte ou invalide.",
    type: "Sélectionnez un type d'opération valide.",
    typePropriete: "Sélectionnez un type de propriété valide.",
    prix: "Saisissez un prix valide, supérieur à zéro.",
    ville: "Saisissez une ville valide.",
    surface: "Indiquez une surface valide, supérieure à zéro.",
    chambres: "Indiquez un nombre entier de chambres, supérieur ou égal à zéro.",
    dateDisponibilite: "Saisissez une date de disponibilité valide.",
  }
  return traduction[champ] ?? "Veuillez vérifier cette valeur."
}

export function CreateAnnonceForm({
  mode = "create",
  annonceId,
  initialValues,
  existingPhotos = [],
}: Props) {
  const isEdit = mode === "edit"

  const action = isEdit
    ? adminUpdateAnnonce.bind(null, annonceId ?? "")
    : createAnnonce

  const [state, formAction, pending] = useActionState(
    action,
    { success: false, values: initialValues } as CreateAnnonceState,
  )

  const adminErreurs = Object.fromEntries(
    Object.entries(state.errors ?? {}).map(([champ, erreurs]) => [
      champ,
      (Array.isArray(erreurs) ? erreurs : []).map((erreur) =>
        adminErreurEnFrancais(champ, erreur),
      ),
    ]),
  ) as Record<string, string[] | undefined>

  const feedbackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state.success || !state.annonceId) {
      return
    }

    requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })

      feedbackRef.current?.focus({
        preventScroll: true,
      })
    })
  }, [state])

  return (
    <form id="admin-annonce-form" action={formAction} noValidate className="space-y-8">
        <style>{`
          #admin-annonce-form [aria-invalid="true"] {
            border-color: var(--destructive) !important;
            box-shadow: 0 0 0 2px color-mix(in srgb, var(--destructive) 18%, transparent);
          }
        `}</style>
      {state.message && !state.success && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {state.message}
        </div>
      )}

      {state.success && state.annonceId && (
        <div
          ref={feedbackRef}
          role="status"
          tabIndex={-1}
          className="scroll-mt-28 flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 outline-none sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </span>

            <div>
              <p className="font-bold">
                {isEdit ? "Annonce modifiée avec succès" : "Annonce créée avec succès"}
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                {isEdit ? "Vos modifications ont été enregistrées." : "Votre annonce a bien été enregistrée en brouillon."}
              </p>
            </div>
          </div>

          <Link
            href={isEdit ? "/admin/annonces" : `/annonces/${state.annonceId}`}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            {isEdit ? "Retour aux annonces" : "Voir l'annonce"}
          </Link>
        </div>
      )}

      {/* INFORMATIONS PRINCIPALES */}
      <section>
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </span>

          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Informations principales
            </h2>

            <p className="text-sm text-muted-foreground">
              Présentez le bien de manière claire et précise.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* TITRE */}
          <div>
            <label htmlFor="titre" className={labelClass}>
              Titre de l&apos;annonce
            </label>

            <div className="relative">
              <Home className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="titre"
                name="titre"
                type="text"
                defaultValue={state.values?.titre ?? ""}
                placeholder="Appartement avec vue sur mer"
                aria-invalid={Boolean(adminErreurs?.titre)}
                aria-describedby={
                  adminErreurs?.titre ? "titre-error" : undefined
                }
                className={inputWithIconClass}
              />
            </div>

            {adminErreurs?.titre?.[0] && (
              <p
                id="titre-error"
                className="mt-2 text-sm font-medium text-destructive"
              >
                {adminErreurs.titre[0]}
              </p>
            )}
          </div>

          {/* DESCRIPTION */}
          <div>
            <label htmlFor="description" className={labelClass}>
              Description
            </label>

            <div className="relative">
              <FileText className="pointer-events-none absolute left-4 top-4 size-4 text-muted-foreground" />

              <textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={state.values?.description ?? ""}
                placeholder="Décrivez le bien, son environnement et ses principaux atouts..."
                aria-invalid={Boolean(adminErreurs?.description)}
                aria-describedby={
                  adminErreurs?.description
                    ? "description-error"
                    : undefined
                }
                className="w-full resize-y rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {adminErreurs?.description?.[0] && (
              <p
                id="description-error"
                className="mt-2 text-sm font-medium text-destructive"
              >
                {adminErreurs.description[0]}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* TYPE DE BIEN */}
      <section>
        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">
            Classification
          </span>

          <h2 className="mt-1 font-display text-xl font-bold text-foreground">
            Type de bien
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* TRANSACTION */}
          <div>
            <label htmlFor="type" className={labelClass}>
              Type de transaction
            </label>

            <select
              id="type"
              name="type"
              defaultValue={state.values?.type ?? ""}
              aria-invalid={Boolean(adminErreurs?.type)}
              className={inputClass}
            >
              <option value="">Sélectionner</option>
              <option value="VENTE">Vente</option>
              <option value="LOCATION">Location</option>
            </select>

            {adminErreurs?.type?.[0] && (
              <p className="mt-2 text-sm font-medium text-destructive">
                {adminErreurs.type[0]}
              </p>
            )}
          </div>

          {/* PROPRIÉTÉ */}
          <div>
            <label htmlFor="typePropriete" className={labelClass}>
              Type de propriété
            </label>

            <select
              id="typePropriete"
              name="typePropriete"
              defaultValue={state.values?.typePropriete ?? ""}
              aria-invalid={Boolean(adminErreurs?.typePropriete)}
              className={inputClass}
            >
              <option value="">Sélectionner</option>
              <option value="APPARTEMENT">Appartement</option>
              <option value="MAISON">Maison</option>
              <option value="VILLA">Villa</option>
              <option value="STUDIO">Studio</option>
              <option value="LOFT">Loft</option>
            </select>

            {adminErreurs?.typePropriete?.[0] && (
              <p className="mt-2 text-sm font-medium text-destructive">
                {adminErreurs.typePropriete[0]}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* LOCALISATION ET CARACTÉRISTIQUES */}
      <section>
        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">
            Caractéristiques
          </span>

          <h2 className="mt-1 font-display text-xl font-bold text-foreground">
            Détails du bien
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* VILLE */}
          <div>
            <label htmlFor="ville" className={labelClass}>
              Ville
            </label>

            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="ville"
                name="ville"
                type="text"
                defaultValue={state.values?.ville ?? ""}
                placeholder="Le Havre"
                aria-invalid={Boolean(adminErreurs?.ville)}
                className={inputWithIconClass}
              />
            </div>

            {adminErreurs?.ville?.[0] && (
              <p className="mt-2 text-sm font-medium text-destructive">
                {adminErreurs.ville[0]}
              </p>
            )}
          </div>

          {/* PRIX */}
          <div>
            <label htmlFor="prix" className={labelClass}>
              Prix
            </label>

            <div className="relative">
              <Euro className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="prix"
                name="prix"
                type="number"
                min="0"
                step="0.01"
                defaultValue={state.values?.prix ?? ""}
                placeholder="250000"
                aria-invalid={Boolean(adminErreurs?.prix)}
                className={inputWithIconClass}
              />
            </div>

            {adminErreurs?.prix?.[0] && (
              <p className="mt-2 text-sm font-medium text-destructive">
                {adminErreurs.prix[0]}
              </p>
            )}
          </div>

          {/* SURFACE */}
          <div>
            <label htmlFor="surface" className={labelClass}>
              Surface
            </label>

            <div className="relative">
              <Ruler className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="surface"
                name="surface"
                type="number"
                min="1"
                defaultValue={state.values?.surface ?? ""}
                placeholder="75"
                aria-invalid={Boolean(adminErreurs?.surface)}
                className={inputWithIconClass}
              />
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Surface en m²
            </p>

            {adminErreurs?.surface?.[0] && (
              <p className="mt-2 text-sm font-medium text-destructive">
                {adminErreurs.surface[0]}
              </p>
            )}
          </div>

          {/* CHAMBRES */}
          <div>
            <label htmlFor="chambres" className={labelClass}>
              Nombre de chambres
            </label>

            <div className="relative">
              <BedDouble className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="chambres"
                name="chambres"
                type="number"
                min="0"
                defaultValue={state.values?.chambres ?? ""}
                placeholder="3"
                aria-invalid={Boolean(adminErreurs?.chambres)}
                className={inputWithIconClass}
              />
            </div>

            {adminErreurs?.chambres?.[0] && (
              <p className="mt-2 text-sm font-medium text-destructive">
                {adminErreurs.chambres[0]}
              </p>
            )}
          </div>
        </div>

        {/* DATE */}
        <div className="mt-5">
          <label htmlFor="dateDisponibilite" className={labelClass}>
            Date de disponibilité
          </label>

          <div className="relative sm:max-w-sm">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              id="dateDisponibilite"
              name="dateDisponibilite"
              type="date"
              defaultValue={state.values?.dateDisponibilite ?? ""}
              aria-invalid={Boolean(
                adminErreurs?.dateDisponibilite,
              )}
              className={inputWithIconClass}
            />
          </div>

          {adminErreurs?.dateDisponibilite?.[0] && (
            <p className="mt-2 text-sm font-medium text-destructive">
              {adminErreurs.dateDisponibilite[0]}
            </p>
          )}
        </div>
      </section>

      <div className="border-t border-border" />

      {/* PHOTOS */}
      <section>
        <div className="mb-5">
          <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">
            Galerie
          </span>

          <h2 className="mt-1 font-display text-xl font-bold text-foreground">
            Photos du bien
          </h2>

        </div>

        <PhotoDropzone
          existingPhotos={isEdit ? existingPhotos : []}
          error={adminErreurs?.photos?.[0]}
        />
      </section>

      {/* ACTION */}
      <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {!isEdit && (
          <p className="text-sm text-muted-foreground">
            L&apos;annonce sera créée en{" "}
            <strong className="text-foreground">brouillon</strong>.
          </p>
        )}

        <button
          type="submit"
          disabled={pending || (!isEdit && state.success)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Building2 className="size-4" />

          {pending
            ? isEdit
              ? "Enregistrement en cours..."
              : "Création en cours..."
            : isEdit
              ? "Enregistrer les modifications"
              : state.success
                ? "Annonce créée"
                : "Créer l'annonce"}
        </button>
      </div>
    </form>
  )
}