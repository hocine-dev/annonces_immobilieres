
"use client"

import { useState, useTransition } from "react"
import { adminChangePublication } from "@/actions/admin-publication-annonce"

type Statut = "PUBLIE" | "BROUILLON"

type Props = {
  annonceId: string
  initialStatut: Statut
}

export function AnnoncePublicationSwitch({
  annonceId,
  initialStatut,
}: Props) {
  const [statut, setStatut] = useState<Statut>(initialStatut)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [error, setError] = useState(false)

  const isPublished = statut === "PUBLIE"

  function togglePublication() {
    if (pending) return

    const nextStatut: Statut = isPublished
      ? "BROUILLON"
      : "PUBLIE"

    setMessage("")

    startTransition(async () => {
      const formData = new FormData()
      formData.set("annonceId", annonceId)
      formData.set("statut", nextStatut)

      try {
        const result = await adminChangePublication(
          { success: false, message: "" },
          formData,
        )

        if (!result.success || !result.statut) {
          setError(true)
          setMessage(result.message)
          return
        }

        setStatut(result.statut)
        setError(false)
        setMessage(result.message)
      } catch {
        setError(true)
        setMessage("Impossible de modifier le statut.")
      }
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <h2 className="font-display text-lg font-bold">
            Statut de publication
          </h2>

          <p className={`mt-1 text-sm font-semibold ${
            isPublished
              ? "text-emerald-700"
              : "text-amber-700"
          }`}>
            {isPublished ? "Publiée" : "Brouillon"}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-label="Publication de l'annonce"
          aria-checked={isPublished}
          disabled={pending}
          onClick={togglePublication}
          className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${
            isPublished ? "bg-emerald-600" : "bg-slate-300"
          }`}
        >
          <span
            aria-hidden="true"
            className={`size-7 rounded-full bg-white shadow-sm transition-transform ${
              isPublished ? "translate-x-7" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {(pending || message) && (
        <p
          role={error ? "alert" : "status"}
          aria-live="polite"
          className={`mt-3 text-sm font-medium ${
            error
              ? "text-destructive"
              : "text-emerald-700"
          }`}
        >
          {pending ? "Enregistrement..." : message}
        </p>
      )}
    </section>
  )
}
