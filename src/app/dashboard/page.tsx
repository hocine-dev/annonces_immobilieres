import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Heart,
  MessageCircleQuestion,
  Search,
  UserRound,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"

type DashboardPageProps = {
  searchParams: Promise<{
    created?: string
  }>
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  const params = await searchParams
  const accountCreated = params.created === "1"

 

 if (session.user.role === "AGENT") {
  redirect("/agent/dashboard")
}

if (session.user.role === "ADMIN") {
  redirect("/admin/dashboard")
}

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* En-tête */}
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">
                Espace personnel
              </span>

              <h1 className="font-display text-3xl font-semibold md:text-4xl">
                Bonjour {session.user.name}
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-white/70 md:text-base">
                Retrouvez votre espace Horizon Immo et accédez rapidement à
                vos annonces favorites et à vos échanges.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          {/* Message après inscription */}
          {accountCreated && (
            <div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">
                  Votre compte a bien été créé.
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  Bienvenue sur Horizon Immo. Vous pouvez maintenant profiter
                  de votre espace personnel.
                </p>
              </div>
            </div>
          )}

          {/* Informations du compte */}
          <section className="mb-10 rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="h-7 w-7" />
                </div>

                <div>
                  <p className="font-display text-xl font-semibold text-foreground">
                    {session.user.name}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <div className="inline-flex w-fit items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                Utilisateur
              </div>
            </div>
          </section>

          {/* Actions USER */}
          <section>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Mon espace
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Accédez rapidement aux fonctionnalités de votre compte.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Consulter les annonces */}
              <Link
                href="/"
                className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Search className="h-6 w-6" />
                </div>

                <h3 className="font-display text-lg font-semibold">
                  Rechercher un bien
                </h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Parcourez les biens disponibles à la vente ou à la location.
                </p>

                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                  Voir les annonces
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Favoris */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <Heart className="h-6 w-6" />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">
                    Mes favoris
                  </h3>


                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Retrouvez les annonces que vous avez enregistrées dans vos
                  favoris.
                </p>

                <Link href={`/favoris`} className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                  Voir les Favoris
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Questions */}
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-amber-700">
                  <MessageCircleQuestion className="h-6 w-6" />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">
                    Mes questions
                  </h3>
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Suivez les questions envoyées aux agents et consultez leurs
                  réponses.
                </p>

                <Link href={`/mesquestions`} className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                  Voir les questions
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}