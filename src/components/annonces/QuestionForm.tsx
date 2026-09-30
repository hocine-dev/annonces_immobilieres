"use client"

import { useActionState } from "react"
import { MessageCircleQuestion, Send } from "lucide-react"

import {
  poserQuestion,
  type QuestionState,
} from "@/actions/question"

const initialState: QuestionState = {
  success: false,
}

export function QuestionForm({
  annonceId,
}: {
  annonceId: string
}) {
  const [state, formAction, pending] = useActionState(
    poserQuestion,
    initialState,
  )

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-border bg-card p-6 shadow-sm"
    >
      <input
        type="hidden"
        name="annonceId"
        value={annonceId}
      />

      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gold/15 text-amber-700">
          <MessageCircleQuestion className="size-5" />
        </div>

        <div>
          <h3 className="font-display text-lg font-semibold">
            Une question sur ce bien ?
          </h3>

          <p className="text-sm text-muted-foreground">
            L'agent responsable pourra vous répondre.
          </p>
        </div>
      </div>

      <label
        htmlFor="texte"
        className="mb-2 block text-sm font-semibold"
      >
        Votre question
      </label>

      <textarea
        id="texte"
        name="texte"
        rows={4}
        defaultValue={state.values?.texte ?? ""}
        placeholder="Ex. : Le bien est-il toujours disponible ?"
        aria-describedby={
          state.errors?.texte ? "texte-error" : undefined
        }
        className="w-full resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {state.errors?.texte && (
        <p
          id="texte-error"
          className="mt-2 text-sm font-medium text-red-600"
        >
          {state.errors.texte[0]}
        </p>
      )}

      {state.message && (
        <p
          className={`mt-3 text-sm font-medium ${
            state.success
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="size-4" />

        {pending
          ? "Envoi..."
          : "Envoyer ma question"}
      </button>
    </form>
  )
}