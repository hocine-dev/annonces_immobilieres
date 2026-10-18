import Link from "next/link"
import Image from "next/image"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Pencil,
  Plus,
} from "lucide-react"

import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function AgentPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "AGENT") {
    redirect(
      session.user.role === "ADMIN"
        ? "/admin/dashboard"
        : "/dashboard"
    )
  }

  const annonces = await prisma.annonce.findMany({
    where: {
      auteurId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      titre: true,
      ville: true,
      type: true,
      statut: true,
      etat: true,
      prix: true,
      photos: {
        take: 1,
        select: {
          url: true,
        },
      },
    },
  })

  const publiees = annonces.filter(
    (annonce) => annonce.statut === "PUBLIE"
  ).length

  const brouillons = annonces.filter(
    (annonce) => annonce.statut === "BROUILLON"
  ).length

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1">
        <section className="bg-navy py-12 text-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Link
              href="/agent/dashboard"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Link>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-gold">
                  Espace agent
                </p>

                <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
                  Mes annonces
                </h1>

                <p className="mt-3 text-white/70">
                  Consultez et gérez vos biens immobiliers.
                </p>
              </div>

              <Link
                href="/annonces/nouvelle"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-3 font-semibold text-navy transition-opacity hover:opacity-90"
              >
                <Plus className="h-5 w-5" />
                Nouvelle annonce
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-8 px-6 py-10 lg:px-8">
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total", value: annonces.length },
              { label: "Publiées", value: publiees },
              { label: "Brouillons", value: brouillons },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 font-display text-3xl font-bold">
                  {stat.value}
                </p>
              </div>
            ))}
          </section>

          {annonces.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />

              <h2 className="mt-5 text-xl font-semibold">
                Aucune annonce pour le moment
              </h2>

              <p className="mt-2 text-muted-foreground">
                Créez votre première annonce immobilière.
              </p>

              <Link
                href="/annonces/nouvelle"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
              >
                <Plus className="h-4 w-4" />
                Créer une annonce
              </Link>
            </div>
          ) : (
            <section className="space-y-5">
              <h2 className="font-display text-xl font-semibold">
                Toutes mes annonces ({annonces.length})
              </h2>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {annonces.map((annonce) => (
                  <article
                    key={annonce.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative h-48 bg-muted">
                      {annonce.photos[0] ? (
                        <Image
                          src={annonce.photos[0].url}
                          alt={annonce.titre}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Building2 className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}

                      <span
                        className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                          annonce.statut === "PUBLIE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {annonce.statut === "PUBLIE"
                          ? "Publiée"
                          : "Brouillon"}
                      </span>
                    </div>

                    <div className="space-y-4 p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {annonce.type === "VENTE"
                            ? "Vente"
                            : "Location"}
                        </p>

                        <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold">
                          {annonce.titre}
                        </h3>

                        <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {annonce.ville}
                        </p>
                      </div>

                      <p className="text-xl font-bold">
                        {Number(annonce.prix).toLocaleString("fr-FR")} €
                        {annonce.type === "LOCATION" && (
                          <span className="text-sm font-normal text-muted-foreground">
                            /mois
                          </span>
                        )}
                      </p>

                      <div className="flex gap-3 border-t border-border pt-4">
                        <Link
                          href={`/agent/annonces/${annonce.id}`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Gérer
                        </Link>

                        <Link
                          href={`/agent/annonces/${annonce.id}/edit`}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
                        >
                          <Pencil className="h-4 w-4" />
                          Modifier
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
