
"use client"

import { useActionState, useState } from "react"
import {
  adminChangeEtat,
  type AdminEtatState,
} from "@/actions/admin-etat-annonce"

type Etat = "DISPONIBLE" | "LOUE" | "VENDU"

type Props = {
  annonceId: string
  type: "VENTE" | "LOCATION"
  initialEtat: Etat
}

export function AnnonceEtatSelector({
  annonceId,
  type,
  initialEtat,
}: Props) {
  const [selectedEtat, setSelectedEtat] =
    useState<Etat>(initialEtat)

  const [state, formAction, pending] = useActionState(
    adminChangeEtat,
    {
      success: false,
      message: "",
      etat: initialEtat,
    } satisfies AdminEtatState,
  )

  const currentEtat = state.etat ?? initialEtat

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-bold">
        État du bien
      </h2>

      <form action={formAction} className="mt-4">
        <input
          type="hidden"
          name="annonceId"
          value={annonceId}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="etat-bien"
              className="mb-2 block text-sm font-semibold"
            >
              État actuel
            </label>

            <select
              id="etat-bien"
              name="etat"
              value={selectedEtat}
              onChange={(event) =>
                setSelectedEtat(
                  event.target.value as Etat,
                )
              }
              disabled={pending}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              <option value="DISPONIBLE">
                Disponible
              </option>

              {type === "VENTE" ? (
                <option value="VENDU">
                  Vendu
                </option>
              ) : (
                <option value="LOUE">
                  Loué
                </option>
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={
              pending || selectedEtat === currentEtat
            }
            className="h-12 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending
              ? "Enregistrement..."
              : "Enregistrer"}
          </button>
        </div>
      </form>

      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={`mt-3 text-sm font-medium ${
            state.success
              ? "text-emerald-700"
              : "text-destructive"
          }`}
        >
          {state.message}
        </p>
      )}
    </section>
  )
}
