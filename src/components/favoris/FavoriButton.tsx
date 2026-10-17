'use client'

import { useActionState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'react-toastify'
import { toggleFavori } from '@/actions/favori'


type FavoriButtonProps = {
  annonceId: string
  isFavoriteInitial: boolean
}

export function FavoriButton({ annonceId, isFavoriteInitial }: FavoriButtonProps) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await toggleFavori(formData)
      return res
    },
    null
  )

  // Déclenchement du toast sur retour de la Server Action
  useEffect(() => {
    if (!state) return

    if (state.success) {
      if (state.isFavorite) {
        toast.success("Annonce ajoutée à vos favoris !")
      } else {
        toast.info("Annonce retirée de vos favoris.")
      }
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state])

  // Déterminer si l'annonce est en favori (état local optimiste ou serveur)
  const isFavorite = state?.success ? state.isFavorite : isFavoriteInitial

  return (
    <form action={formAction}>
      <input type="hidden" name="annonceId" value={annonceId} />

      <button
        type="submit"
        disabled={isPending}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm transition ${
          isFavorite
            ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/[0.03]"
        } ${isPending ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        <Heart
          className={`size-5 ${
            isFavorite ? "fill-current text-rose-600" : ""
          }`}
        />

        {isFavorite
          ? "Retirer des favoris"
          : "Ajouter aux favoris"}
      </button>
    </form>
  )
}