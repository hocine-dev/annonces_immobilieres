
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Eye,
  Plus,
  Pencil,
  Search,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { DeleteAnnonceButton } from "@/components/admin/DeleteAnnonceButton"

type PageProps = {
  searchParams: Promise<{
    q?: string
    statut?: string
    page?: string
    deleted?: string
    cleanup?: string
  }>
}

const PAGE_SIZE = 12

export default async function AdminAnnoncesPage({
  searchParams,
}: PageProps) {
  // 1. AUTHENTIFICATION
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // 2. AUTORISATION
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // 3. FILTRES
  const params = await searchParams

  const q =
    typeof params.q === "string"
      ? params.q.trim().slice(0, 100)
      : ""

  const statut: "PUBLIE" | "BROUILLON" | "TOUTES" =
    params.statut === "PUBLIE" ||
    params.statut === "BROUILLON"
      ? params.statut
      : "TOUTES"

  const requestedPage = Number(params.page ?? 1)

  const pageNumber =
    Number.isSafeInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1

  const where = {
    ...(statut !== "TOUTES" ? { statut } : {}),
    ...(q
      ? {
          OR: [
            {
              titre: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
            {
              ville: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  }

  // 4. RÉCUPÉRATION DES ANNONCES
  // Aucun filtre sur auteurId :
  // l'ADMIN voit toutes les annonces.
  const total = await prisma.annonce.count({
    where,
  })

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE),
  )

  const currentPage = Math.min(
    pageNumber,
    totalPages,
  )

  const annonces = await prisma.annonce.findMany({
    where,
    select: {
      id: true,
      titre: true,
      ville: true,
      prix: true,
      type: true,
      statut: true,
      etat: true,
      createdAt: true,
      auteur: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  const formatPrice = (prix: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(prix)

  function pageUrl(page: number) {
    const query = new URLSearchParams()

    if (q) query.set("q", q)
    if (statut !== "TOUTES") {
      query.set("statut", statut)
    }

    query.set("page", String(page))

    return `/admin/annonces?${query.toString()}`
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* EN-TÊTE */}
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Tableau de bord
            </Link>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gold">
                  Administration
                </p>

                <h1 className="mt-2 font-display text-3xl font-semibold">
                  Toutes les annonces
                </h1>

                <p className="mt-2 text-sm text-white/70">
                  Consultez les annonces de tous les agents,
                  y compris les brouillons.
                </p>
              </div>

              <Link
                href="/annonces/nouvelle"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                <Plus className="size-4" />
                Nouvelle annonce
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-6 px-6 py-10 lg:px-8">

          {params.deleted === "1" && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800"
            >
              Annonce supprimée avec succès.
            </div>
          )}

          {params.cleanup === "1" && (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-900"
            >
              Le nettoyage de certaines photos nécessite une intervention.
            </div>
          )}

          {/* RECHERCHE */}
          <form
            action="/admin/annonces"
            method="get"
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-semibold"
              >
                Rechercher une annonce
              </label>

              <input
                id="q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="Titre ou ville..."
                className="h-11 w-full rounded-xl border border-input bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="md:w-52">
              <label
                htmlFor="statut"
                className="mb-2 block text-sm font-semibold"
              >
                Publication
              </label>

              <select
                id="statut"
                name="statut"
                defaultValue={statut}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="TOUTES">
                  Toutes
                </option>
                <option value="PUBLIE">
                  Publiées
                </option>
                <option value="BROUILLON">
                  Brouillons
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Search className="size-4" />
              Rechercher
            </button>
          </form>

          {/* RÉSULTATS */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">
              Annonces
            </h2>

            <span className="text-sm text-muted-foreground">
              {total} résultat{total > 1 ? "s" : ""}
            </span>
          </div>

          {annonces.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
              <Building2 className="mx-auto size-10 text-muted-foreground" />

              <h3 className="mt-4 font-semibold">
                Aucune annonce trouvée
              </h3>

              <p className="mt-2 text-sm text-muted-foreground">
                Essayez de modifier vos critères de recherche.
              </p>

              <Link
                href="/admin/annonces"
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Effacer les filtres
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {annonces.map((annonce) => (
                <article
                  key={annonce.id}
                  className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          annonce.statut === "PUBLIE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {annonce.statut === "PUBLIE"
                          ? "Publiée"
                          : "Brouillon"}
                      </span>

                      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                        {annonce.type === "VENTE"
                          ? "Vente"
                          : "Location"}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {annonce.etat}
                      </span>
                    </div>

                    <h3 className="mt-3 truncate font-display text-lg font-semibold">
                      {annonce.titre}
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {annonce.ville} · Agent : {annonce.auteur.name}
                    </p>

                    <p className="mt-2 text-sm font-bold text-primary">
                      {formatPrice(Number(annonce.prix))}
                      {annonce.type === "LOCATION" ? " /mois" : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/admin/annonces/${annonce.id}/edit`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      <Pencil className="size-4" />
                      Modifier
                    </Link>

                    <Link
                    href={`/annonces/${annonce.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/5"
                  >
                    <Eye className="size-4" />
                    Consulter
                  </Link>
                    <DeleteAnnonceButton
                      annonceId={annonce.id}
                      titre={annonce.titre}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination des annonces"
              className="flex items-center justify-center gap-4 pt-5"
            >
              {currentPage > 1 && (
                <Link
                  href={pageUrl(currentPage - 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Précédent
                </Link>
              )}

              <span className="text-sm text-muted-foreground">
                Page {currentPage} / {totalPages}
              </span>

              {currentPage < totalPages && (
                <Link
                  href={pageUrl(currentPage + 1)}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Suivant
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
