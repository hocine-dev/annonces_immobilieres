import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  Heart,
  House,
  MapPin,
  Ruler,
  UserRound,
  MessageCircleQuestion,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { QuestionForm } from "@/components/annonces/QuestionForm"

import { FavoriteToggleForm } from "@/components/annonces/FavoriteToggleForm"
import { annonceIdSchema } from "@/lib/validators/interaction-annonce"
import { FavoriButton } from "@/components/favoris/FavoriButton"

type AnnoncePageProps = {
  params: Promise<{
    id: string
  }>
}

function formatPrix(
  prix: number,
  type: "VENTE" | "LOCATION",
) {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(prix)

  return type === "LOCATION"
    ? `${formatted} / mois`
    : formatted
}

function propertyLabel(type: string) {
  const labels: Record<string, string> = {
    APPARTEMENT: "Appartement",
    MAISON: "Maison",
    VILLA: "Villa",
    STUDIO: "Studio",
    LOFT: "Loft",
  }

  return labels[type] ?? type
}

export default async function AnnonceDetailPage({
  params,
}: AnnoncePageProps) {
  const { id } = await params

  /*
   * Paramètre d'URL validé avant utilisation.
   */
  const parsedId = annonceIdSchema.safeParse(id)

  if (!parsedId.success) {
    notFound()
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  const annonce = await prisma.annonce.findUnique({
    where: {
      id: parsedId.data,
    },

    include: {
      photos: true,

      auteur: {
        select: {
          id: true,
          name: true,
        },
      },

      questions: {
        orderBy: {
          createdAt: "desc",
        },

        include: {
          auteur: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      favoris: {
        where: {
          userId:
            session?.user.id ??
            "__utilisateur_anonyme__",
        },

        select: {
          id: true,
        },
      },
    },
  })

  if (!annonce) {
    notFound()
  }

  /*
   * Un brouillon est visible uniquement :
   * - par son auteur
   * - par un ADMIN
   */
  if (annonce.statut === "BROUILLON") {
    const peutVoirBrouillon =
      session &&
      (
        session.user.role === "ADMIN" ||
        session.user.id === annonce.auteurId
      )

    if (!peutVoirBrouillon) {
      notFound()
    }
  }

  const isFavorite = annonce.favoris.length > 0

  const canInteract =
    session &&
    (
      session.user.role === "USER" ||
      session.user.role === "ADMIN"
    )

  const image =
    annonce.photos[0]?.url ??
    "/annonces/uploads/prop-maison.jpg"

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Retour */}
        <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <Link
            href="/annonces"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Retour aux annonces
          </Link>
        </div>

        {/* Photo */}
        <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-muted">
            <img
              src={image}
              alt={annonce.titre}
              className="h-[320px] w-full object-cover sm:h-[420px] lg:h-[520px]"
            />

            <div className="absolute left-5 top-5 flex gap-2">
              <span className="rounded-full bg-gold px-4 py-2 text-xs font-bold uppercase tracking-wide text-navy shadow-sm">
                {annonce.type === "VENTE"
                  ? annonce.etat === "VENDU" ? "Vente" : "À vendre"
                  : annonce.etat === "LOUE" ? "Location" : "À louer"}
              </span>

              <span className="rounded-full bg-navy/90 px-4 py-2 text-xs font-bold text-white backdrop-blur">
                {propertyLabel(annonce.typePropriete)}
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          {/* Colonne principale */}
          <div>
            <div className="border-b border-border pb-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MapPin className="size-4 text-primary" />
                    {annonce.ville}
                  </div>

                  <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight text-foreground md:text-4xl">
                    {annonce.titre}
                  </h1>
              {/* Marquage VENDU / LOUÉ */}
              {(annonce.etat === "VENDU" ||
                annonce.etat === "LOUE") && (
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-xl border-2 border-red-600 bg-red-50 px-6 py-2.5 text-lg font-extrabold uppercase tracking-widest text-red-700">
                    {annonce.etat === "VENDU" ? "VENDU" : "LOUÉ"}
                  </span>
                </div>
              )}

                </div>

                <p className="whitespace-nowrap font-display text-3xl font-bold text-primary">
                  {formatPrix(
                    Number(annonce.prix),
                    annonce.type,
                  )}
                </p>
              </div>

              {/* Caractéristiques */}
              <div className={`mt-8 grid grid-cols-2 gap-3 ${
                  annonce.etat === "DISPONIBLE"
                    ? "sm:grid-cols-4"
                    : "sm:grid-cols-3"
                }`}>
                <div className="rounded-2xl bg-secondary/60 p-4">
                  <Ruler className="mb-3 size-5 text-primary" />

                  <p className="text-lg font-bold">
                    {annonce.surface} m²
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Surface
                  </p>
                </div>

                <div className="rounded-2xl bg-secondary/60 p-4">
                  <BedDouble className="mb-3 size-5 text-primary" />

                  <p className="text-lg font-bold">
                    {annonce.chambres}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Chambres
                  </p>
                </div>

                <div className="rounded-2xl bg-secondary/60 p-4">
                  <House className="mb-3 size-5 text-primary" />

                  <p className="text-sm font-bold">
                    {propertyLabel(
                      annonce.typePropriete,
                    )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Type de bien
                  </p>
                </div>

                {annonce.etat === "DISPONIBLE" && (
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <CalendarDays className="mb-3 size-5 text-primary" />

                    <p className="text-sm font-bold">
                      {annonce.dateDisponibilite.toLocaleDateString(
                        "fr-FR",
                      )}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Disponible le
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <section className="border-b border-border py-8">
              <h2 className="font-display text-2xl font-semibold">
                Description
              </h2>

              <p className="mt-4 whitespace-pre-line leading-8 text-muted-foreground">
                {annonce.description}
              </p>
            </section>

            {/* Questions */}
            <section className="py-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCircleQuestion className="size-5" />
                </div>

                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    Questions sur ce bien
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {annonce.questions.length} question
                    {annonce.questions.length > 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>

              {annonce.questions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  Aucune question pour le moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {annonce.questions.map(
                    (question) => (
                      <article
                        key={question.id}
                        className="rounded-3xl border border-border bg-card p-6 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <UserRound className="size-4" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold">
                              {
                                question.auteur
                                  .name
                              }
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {question.createdAt.toLocaleDateString(
                                "fr-FR",
                              )}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 leading-7">
                          {question.texte}
                        </p>

                        {question.reponse ? (
                          <div className="mt-5 rounded-2xl border-l-4 border-gold bg-gold/10 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                              Réponse de l'agent
                            </p>

                            <p className="mt-2 leading-7 text-foreground">
                              {question.reponse}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm italic text-muted-foreground">
                            En attente d'une réponse de l'agent.
                          </p>
                        )}
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Bien proposé par
              </p>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-navy text-white">
                  <UserRound className="size-5" />
                </div>

                <div>
                  <p className="font-semibold">
                    {annonce.auteur.name}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Agent Horizon Immo
                  </p>
                </div>
              </div>
            </div>

            {/* Favori */}
            {canInteract ? (
<<<<<<< HEAD
              <FavoriButton 
                annonceId={annonce.id} 
                isFavoriteInitial={isFavorite} 
=======
              <FavoriteToggleForm
                annonceId={annonce.id}
                initialIsFavorite={isFavorite}
>>>>>>> 3441860fdc8a1a89e7331432b0173a938d2eb670
              />
            ) : !session ? (
              <Link
                href="/login"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <Heart className="size-5" />
                Connectez-vous pour enregistrer ce bien
              </Link>
            ) : null}

            {/* Question */}
            {canInteract && (
              <QuestionForm
                annonceId={annonce.id}
              />
            )}

            {!session && (
              <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
                <p className="text-sm leading-6 text-muted-foreground">
                  Connectez-vous pour poser une
                  question à l'agent.
                </p>

                <Link
                  href="/login"
                  className="mt-4 inline-flex rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90"
                >
                  Se connecter
                </Link>
              </div>
            )}
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  )
}