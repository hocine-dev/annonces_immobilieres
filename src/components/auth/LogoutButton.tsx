"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await authClient.signOut()

    router.push("/")
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">
        Déconnexion
      </span>
    </button>
  )
}