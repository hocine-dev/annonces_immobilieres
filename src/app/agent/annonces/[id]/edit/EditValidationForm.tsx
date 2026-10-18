"use client"

import { createContext, useActionState, useContext, useEffect, useRef } from "react"
import type { ReactNode } from "react"

import {
  updateAnnonceAvecRetour,
  type UpdateAnnonceState,
} from "./validation-actions"

const ErrorsContext = createContext<Record<string, string[]>>({})

const initialState: UpdateAnnonceState = {
  attempted: false,
  errors: {},
  values: {},
  selectedPhotoIds: [],
}

export function EditValidationForm({
  annonceId,
  children,
}: {
  annonceId: string
  children: ReactNode
}) {
  const [state, formAction, pending] = useActionState(
    updateAnnonceAvecRetour.bind(null, annonceId),
    initialState,
  )
  const formRef = useRef<HTMLFormElement>(null)

  // React peut réinitialiser les champs non contrôlés après une Server Action.
  // Restaurer explicitement les valeurs envoyées en cas de validation refusée.
  useEffect(() => {
    if (!state.attempted || !formRef.current) return
    const form = formRef.current

    for (const [name, value] of Object.entries(state.values ?? {})) {
      const field = form.elements.namedItem(name)
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement ||
        field instanceof HTMLSelectElement
      ) {
        if (field instanceof HTMLInputElement && field.type === "file") continue
        field.value = value
      }
    }

    const selected = new Set(state.selectedPhotoIds ?? [])
    for (const field of form.querySelectorAll<HTMLInputElement>(
      'input[name="deletePhotos"]',
    )) {
      field.checked = selected.has(field.value)
    }
  }, [state])

  return (
    <ErrorsContext.Provider value={state.errors ?? {}}>
      <form ref={formRef} action={formAction} noValidate className="space-y-6">
        {state.message && (
          <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">
            {state.message}
          </p>
        )}
        {children}
        {pending && <p role="status" className="text-sm">Enregistrement en cours…</p>}
      </form>
    </ErrorsContext.Provider>
  )
}

export function EditFieldError({ name }: { name: string }) {
  const errors = useContext(ErrorsContext)[name]
  if (!errors?.length) return null

  return (
    <p id={`${name}-error`} role="alert" className="mt-1 text-xs text-destructive">
      {errors.join(" ")}
    </p>
  )
}
