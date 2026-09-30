import Link from "next/link"
import { headers } from "next/headers"

import {
  Building2,
  BriefcaseBusiness,
  ShieldCheck,
  UserRound,
  LayoutDashboard,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { LogoutButton } from "@/components/auth/LogoutButton"

export async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const role = session?.user.role

  const dashboardHref =
    role === "ADMIN"
      ? "/admin/dashboard"
      : role === "AGENT"
        ? "/agent/dashboard"
        : "/dashboard"

  const roleLabel =
    role === "ADMIN"
      ? "Administrateur"
      : role === "AGENT"
        ? "Agent immobilier"
        : "Utilisateur"

  const RoleIcon =
    role === "ADMIN"
      ? ShieldCheck
      : role === "AGENT"
        ? BriefcaseBusiness
        : UserRound

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-3"
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Building2 className="size-5" />
          </span>

          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            Horizon
            <span className="text-primary">
              Immo
            </span>
          </span>
        </Link>

        {/* Navigation centrale */}
        <nav className="hidden items-center gap-8 lg:flex">
          <Link
            href="/#annonces"
            className="relative py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Annonces
          </Link>

          {session && (
            <Link
              href={dashboardHref}
              className="flex items-center gap-2 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <LayoutDashboard className="size-4" />
              Tableau de bord
            </Link>
          )}
        </nav>

        {/* Partie droite */}
        <div className="flex items-center gap-3">
          {!session ? (
            <Link
              href="/login"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md"
            >
              Connexion
            </Link>
          ) : (
            <>
              {/* Profil */}
              <Link
                href={dashboardHref}
                className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-2.5 py-2 pr-4 shadow-sm transition-all duration-200 hover:border-primary/25 hover:shadow-md"
              >
                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                  <RoleIcon className="size-[18px]" />

                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-gold" />
                </div>

                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-[150px] truncate text-sm font-semibold leading-tight text-foreground">
                    {session.user.name}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary" />

                    <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground transition-colors group-hover:text-primary">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </Link>

              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
