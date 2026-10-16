
"use client"

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { AlertTriangle, Trash2, X } from "lucide-react"

import {
  adminDeleteAnnonce,
  type AdminDeleteState,
} from "@/actions/admin-delete-annonce"

type Props = {
  annonceId: string
  titre: string
}

const initialState: AdminDeleteState = {
  error: "",
}

export function DeleteAnnonceButton({
  annonceId,
  titre,
}: Props) {
  const [open, setOpen] = useState(false)

  const [state, formAction, pending] = useActionState(
    adminDeleteAnnonce,
    initialState,
  )

  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus()
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        <Trash2 className="size-4" />
        Supprimer
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !pending) {
                setOpen(false)
              }
            }}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertTriangle className="size-6" />
              </div>

              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                <X className="size-5" />
              </button>
            </div>

            <h2
              id={titleId}
              className="mt-5 font-display text-xl font-bold"
            >
              Supprimer cette annonce ?
            </h2>

            <p className="mt-3 break-words text-sm font-semibold">
              {titre}
            </p>

            <p className="mt-3 text-sm text-muted-foreground">
              Cette action est irréversible.
            </p>

            {state.error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700"
              >
                {state.error}
              </p>
            )}

            <form action={formAction} className="mt-7">
              <input
                type="hidden"
                name="annonceId"
                value={annonceId}
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  disabled={pending}
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="size-4" />
                  {pending
                    ? "Suppression..."
                    : "Confirmer la suppression"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
