"use client"

import { useActionState } from "react"
import {
  CheckCircle2,
  Send,
} from "lucide-react"

import {
  repondreQuestion,
  type ReponseQuestionState,
} from "@/actions/question"

type ReponseQuestionFormProps = {
  questionId: string
  initialReponse?: string | null
}

const initialState: ReponseQuestionState = {
  success: false,
}

export function ReponseQuestionForm({
  questionId,
  initialReponse,
}: ReponseQuestionFormProps) {
  const [state, formAction, pending] =
    useActionState(
      repondreQuestion,
      initialState,
    )

  const currentValue =
    state.values?.reponse ??
    initialReponse ??
    ""

  return (
    <form
      action={formAction}
      className="mt-5 rounded-2xl border border-border bg-background p-4"
    >
      <input
        type="hidden"
        name="questionId"
        value={questionId}
      />

      <label
        htmlFor={`reponse-${questionId}`}
        className="mb-2 block text-sm font-semibold text-foreground"
      >
        {initialReponse
          ? "Modifier votre réponse"
          : "Votre réponse"}
      </label>

      <textarea
        id={`reponse-${questionId}`}
        name="reponse"
        rows={4}
        defaultValue={currentValue}
        placeholder="Écrivez votre réponse au client..."
        aria-describedby={
          state.errors?.reponse
            ? `reponse-error-${questionId}`
            : undefined
        }
        className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {state.errors?.reponse && (
        <p
          id={`reponse-error-${questionId}`}
          className="mt-2 text-sm font-medium text-red-600"
        >
          {state.errors.reponse[0]}
        </p>
      )}

      {state.message && (
        <div
          className={`mt-3 flex items-center gap-2 text-sm font-medium ${
            state.success
              ? "text-emerald-700"
              : "text-red-600"
          }`}
        >
          {state.success && (
            <CheckCircle2 className="size-4" />
          )}

          {state.message}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="size-4" />

          {pending
            ? "Enregistrement..."
            : initialReponse
              ? "Modifier la réponse"
              : "Envoyer la réponse"}
        </button>
      </div>
    </form>
  )
}