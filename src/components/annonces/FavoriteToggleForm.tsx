
"use client"

import { useActionState } from "react"
import { Heart } from "lucide-react"
import { toggleFavori } from "@/actions/favori"

type FavoriteState = {
  success: boolean | null
  message: string
  isFavorite: boolean
}

type Props = {
  annonceId: string
  initialIsFavorite: boolean
}

async function handleFavorite(
  previousState: FavoriteState,
  formData: FormData,
): Promise<FavoriteState> {
  try {
    const result = await toggleFavori(formData)

    if (!result.success) {
      return {
        ...previousState,
        success: false,
        message:
          result.message ??
          "Impossible de modifier les favoris.",
      }
    }

    const nextIsFavorite =
      typeof result.isFavorite === "boolean"
        ? result.isFavorite
        : previousState.isFavorite

    return {
      success: true,
      isFavorite: nextIsFavorite,
      message: nextIsFavorite
        ? "Annonce ajoutée aux favoris."
        : "Annonce retirée des favoris.",
    }
  } catch {
    return {
      ...previousState,
      success: false,
      message: "Une erreur inattendue est survenue.",
    }
  }
}

export function FavoriteToggleForm({
  annonceId,
  initialIsFavorite,
}: Props) {
  const [state, formAction, pending] = useActionState(
    handleFavorite,
    {
      success: null,
      message: "",
      isFavorite: initialIsFavorite,
    },
  )

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input
          type="hidden"
          name="annonceId"
          value={annonceId}
        />

        <button
          type="submit"
          disabled={pending}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
            state.isFavorite
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/[0.03]"
          }`}
        >
          <Heart
            className={`size-5 ${
              state.isFavorite ? "fill-current" : ""
            }`}
          />

          {pending
            ? "Modification en cours..."
            : state.isFavorite
              ? "Retirer des favoris"
              : "Ajouter aux favoris"}
        </button>
      </form>

      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={`text-sm font-medium ${
            state.success
              ? "text-emerald-700"
              : "text-destructive"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  )
}
