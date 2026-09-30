import Link from "next/link"
import { headers } from "next/headers"

import {
  Building2,
  UserRound,
  BriefcaseBusiness,
  ShieldCheck,
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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="size-5" />
          </span>

          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            Horizon
            <span className="text-primary">Immo</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/#annonces"
            className="hidden text-sm font-semibold text-foreground/70 transition-colors hover:text-primary md:block"
          >
            Annonces
          </Link>

      

          {!session ? (
            <Link
              href="/login"
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Connexion
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {/* Profil / rôle */}
              <Link
                href={dashboardHref}
                className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-2.5 py-2 pr-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-md"
              >
                {/* Avatar */}
                <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white shadow-sm">
                  <RoleIcon className="size-[18px]" />

                  {/* Accent Horizon Immo */}
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-gold" />
                </div>

                {/* Identité */}
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="max-w-[140px] truncate text-sm font-semibold leading-tight text-foreground">
                    {session.user.name}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-primary" />

                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors group-hover:text-primary">
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </Link>

              <LogoutButton />
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}