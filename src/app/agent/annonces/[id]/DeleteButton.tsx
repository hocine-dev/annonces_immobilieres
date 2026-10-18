'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

type DeleteButtonProps = {
  action: () => Promise<void>
}

export function DeleteButton({ action }: DeleteButtonProps) {
  const [open, setOpen] = useState(false)
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
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground hover:opacity-90 font-medium rounded-[var(--radius)] transition-opacity cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        Supprimer l&apos;annonce
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
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
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>

            <h2 id={titleId} className="mt-5 font-display text-xl font-bold">
              Supprimer cette annonce ?
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              Cette action est irréversible.
            </p>

            <form action={action} className="mt-7">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-muted"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <Trash2 className="size-4" />
                  Confirmer la suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}