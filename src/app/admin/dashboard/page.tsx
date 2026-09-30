import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Building2,
  Users,
  ShieldCheck,
  UserRound,
  ArrowRight,
  Plus,
  UserCog,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"

export default async function AdminDashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  // 1. Authentification
  if (!session) {
    redirect("/login")
  }

  // 2. Autorisation
  if (session.user.role === "USER") {
    redirect("/dashboard")
  }

  if (session.user.role === "AGENT") {
    redirect("/agent/dashboard")
  }

  const [
    totalUsers,
    totalAgents,
    totalAnnonces,
    annoncesPubliees,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        role: "AGENT",
      },
    }),

    prisma.annonce.count(),

    prisma.annonce.count({
      where: {
        statut: "PUBLIE",
      },
    }),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">
              Administration
            </span>

            <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Bonjour {session.user.name}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Pilotez les utilisateurs, les agents et les annonces de la
              plateforme Horizon Immo.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          {/* Profil */}
          <section className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="h-7 w-7" />
                </div>

                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {session.user.name}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <span className="flex w-fit items-center gap-2 rounded-full bg-gold/15 px-4 py-2 text-sm font-semibold text-amber-700">
                <ShieldCheck className="h-4 w-4" />
                Administrateur
              </span>
            </div>
          </section>

          {/* Statistiques */}
          <section className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <Users className="mb-5 h-6 w-6 text-primary" />

              <p className="text-sm text-muted-foreground">
                Utilisateurs
              </p>

              <p className="mt-2 font-display text-3xl font-semibold">
                {totalUsers}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <UserCog className="mb-5 h-6 w-6 text-amber-700" />

              <p className="text-sm text-muted-foreground">
                Agents
              </p>

              <p className="mt-2 font-display text-3xl font-semibold">
                {totalAgents}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <Building2 className="mb-5 h-6 w-6 text-primary" />

              <p className="text-sm text-muted-foreground">
                Annonces
              </p>

              <p className="mt-2 font-display text-3xl font-semibold">
                {totalAnnonces}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <ShieldCheck className="mb-5 h-6 w-6 text-emerald-600" />

              <p className="text-sm text-muted-foreground">
                Annonces publiées
              </p>

              <p className="mt-2 font-display text-3xl font-semibold">
                {annoncesPubliees}
              </p>
            </div>
          </section>

          {/* Administration */}
          <section>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold">
                Administration
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Gérez les principales ressources de Horizon Immo.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Link
                href="/admin/users"
                className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>

                <h3 className="font-display text-lg font-semibold">
                  Gérer les utilisateurs
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Consultez les comptes et attribuez ou retirez le rôle
                  d'agent.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                  Gérer les utilisateurs

                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/annonces/nouvelle"
                className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-amber-700">
                  <Plus className="h-6 w-6" />
                </div>

                <h3 className="font-display text-lg font-semibold">
                  Créer une annonce
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Ajoutez directement un nouveau bien immobilier à la
                  plateforme.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                  Nouvelle annonce

                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Building2 className="h-6 w-6" />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">
                    Toutes les annonces
                  </h3>

                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    Bientôt
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Gérez l'ensemble des annonces publiées par tous les agents.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}