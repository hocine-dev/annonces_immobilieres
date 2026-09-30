"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react"

import { authClient } from "@/lib/auth-client"

export function RegisterForm() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")
    setLoading(true)

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setError(
        error.message ?? "Impossible de créer votre compte.",
      )
      return
    }

    router.push("/dashboard?created=1")
    router.refresh()
  }

  const inputClass =
    "h-12 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Nom complet
        </label>

        <div className="relative">
          <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Jean Dupont"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Adresse email
        </label>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="vous@exemple.fr"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-semibold text-foreground"
        >
          Mot de passe
        </label>

        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            placeholder="8 caractères minimum"
            className={inputClass}
          />
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Utilisez au minimum 8 caractères.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          "Création du compte..."
        ) : (
          <>
            Créer mon compte
            <ArrowRight className="size-4" />
          </>
        )}
      </button>
    </form>
  )
}