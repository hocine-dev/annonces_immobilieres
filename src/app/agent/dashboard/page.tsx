import Link from "next/link"
import {
headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Building2,
  FilePenLine,
  Plus,
  Eye,
  FileClock,
  ArrowRight,
  UserRound,
  MessageCircleQuestion,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"

export default async function AgentDashboardPage() {
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

  if (session.user.role === "ADMIN") {
    redirect("/admin/dashboard")
  }

  const auteurId = session.user.id

  const [
    totalAnnonces,
    annoncesPubliees,
    annoncesBrouillons,
    annoncesRecentes,
  ] = await Promise.all([
    prisma.annonce.count({
      where: {
        auteurId,
      },
    }),

    prisma.annonce.count({
      where: {
        auteurId,
        statut: "PUBLIE",
      },
    }),

    prisma.annonce.count({
      where: {
        auteurId,
        statut: "BROUILLON",
      },
    }),

    prisma.annonce.findMany({
      where: {
        auteurId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 4,

      select: {
        id: true,
        titre: true,
        ville: true,
        statut: true,
        type: true,
        prix: true,
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
              Espace agent
            </span>

            <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Bonjour {session.user.name}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              Gérez vos annonces immobilières, leur publication et vos futures
              interactions avec les utilisateurs.
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

              <span className="w-fit rounded-full bg-gold/15 px-4 py-2 text-sm font-semibold text-amber-700">
                Agent immobilier
              </span>
            </div>
          </section>

          {/* Statistiques */}
          <section className="mb-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                Mes annonces
              </p>

              <p className="mt-2 font-display text-3xl font-semibold">
                {totalAnnonces}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Eye className="h-5 w-5" />
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                Publiées
              </p>

              <p className="mt-2 font-display text-3xl font-semibold">
                {annoncesPubliees}
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <FileClock className="h-5 w-5" />
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                Brouillons
              </p>

              <p className="mt-2 font-display text-3xl font-semibold">
                {annoncesBrouillons}
              </p>
            </div>
          </section>

          {/* Actions */}
          <section className="mb-10">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold text-foreground">
                Gestion
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Accédez aux principales fonctionnalités de votre espace agent.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Nouvelle annonce */}
              <Link
                href="/annonces/nouvelle"
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Plus className="h-6 w-6" />
                </div>

                <h3 className="font-display text-lg font-semibold text-foreground">
                  Nouvelle annonce
                </h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  Ajoutez un nouveau bien immobilier à votre portefeuille.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                  Créer une annonce

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Mes annonces */}
              <Link
                href="/agent"
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FilePenLine className="h-6 w-6" />
                </div>

                <h3 className="font-display text-lg font-semibold text-foreground">
                  Gérer mes annonces
                </h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  Consultez, modifiez et gérez les biens dont vous êtes responsable.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                  Accéder à mes annonces

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Questions clients */}
              <Link
                href="/agent/questions"
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/20 hover:shadow-md"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-amber-700">
                  <MessageCircleQuestion className="h-6 w-6" />
                </div>

                <h3 className="font-display text-lg font-semibold text-foreground">
                  Questions clients
                </h3>

                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  Consultez les questions concernant vos annonces et répondez directement aux utilisateurs.
                </p>

                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-primary">
                  Voir les questions

                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </section>

          {/* Annonces récentes */}
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-semibold">
                  Annonces récentes
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Vos derniers biens ajoutés.
                </p>
              </div>

              <Link
                href="/agent"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Tout voir
              </Link>
            </div>

            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
              {annoncesRecentes.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Vous n'avez encore créé aucune annonce.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {annoncesRecentes.map((annonce) => (
                    <div
                      key={annonce.id}
                      className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h3 className="font-semibold">{annonce.titre}</h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {annonce.ville} · {annonce.type}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-semibold">
                          {Number(annonce.prix).toLocaleString("fr-FR")} €
                        </span>

                        <span
                          className={
                            annonce.statut === "PUBLIE"
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                          }
                        >
                          {annonce.statut === "PUBLIE"
                            ? "Publié"
                            : "Brouillon"}
                        </span>
                        <Link 
                          href={`/agent/details/${annonce.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">Voir</span>
                        </Link>
                      </div>
                      
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}