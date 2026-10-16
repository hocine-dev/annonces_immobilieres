
"use client"

import { useActionState } from "react"
import { changeUserRole } from "@/actions/change-user-role"

type RoleActionState = {
  success: boolean
  message: string
}

type Props = {
  userId: string
  currentRole: "USER" | "AGENT"
}

const initialState: RoleActionState = {
  success: false,
  message: "",
}

async function submitRoleChange(
  _previousState: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  try {
    const result = await changeUserRole(formData)

    return {
      success: result.success,
      message:
        result.message ??
        (result.success
          ? "Rôle modifié avec succès."
          : "Impossible de modifier le rôle."),
    }
  } catch {
    return {
      success: false,
      message: "Une erreur inattendue est survenue.",
    }
  }
}

export function UserRoleForm({
  userId,
  currentRole,
}: Props) {
  const [state, formAction, pending] = useActionState(
    submitRoleChange,
    initialState,
  )

  const targetRole =
    currentRole === "USER" ? "AGENT" : "USER"

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="role" value={targetRole} />

        <button
          type="submit"
          disabled={pending}
          className={
            currentRole === "USER"
              ? "w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              : "w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          }
        >
          {pending
            ? "Modification en cours..."
            : currentRole === "USER"
              ? "Promouvoir agent"
              : "Retirer le rôle"}
        </button>
      </form>

      {state.message && (
        <p
          role={state.success ? "status" : "alert"}
          className={`text-xs font-medium ${
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
