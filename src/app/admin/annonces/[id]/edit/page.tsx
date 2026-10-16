
import Link from "next/link"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { annonceIdSchema } from "@/lib/validators/interaction-annonce"

import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { CreateAnnonceForm } from "@/components/annonces/CreateAnnonceForm"
import { AnnoncePublicationSwitch } from "@/components/admin/AnnoncePublicationSwitch"
import { AnnonceEtatSelector } from "@/components/admin/AnnonceEtatSelector"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function AdminEditAnnoncePage({
  params,
}: PageProps) {
  // 1. Authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // 2. Autorisation : ADMIN uniquement
  if (session.user.role !== "ADMIN") {
    notFound()
  }

  // 3. Validation de l'identifiant
  const { id } = await params
  const parsedId = annonceIdSchema.safeParse(id)

  if (!parsedId.success) {
    notFound()
  }

  // 4. Chargement de l'annonce
  // Aucun filtre sur auteurId : un ADMIN peut
  // modifier les annonces de tous les agents.
  const annonce = await prisma.annonce.findUnique({
    where: {
      id: parsedId.data,
    },
    select: {
      id: true,
      titre: true,
      description: true,
      type: true,
      typePropriete: true,
      prix: true,
      dateDisponibilite: true,
      ville: true,
      surface: true,
      chambres: true,
      statut: true,
      etat: true,
      auteur: {
        select: {
          name: true,
        },
      },
      photos: {
        select: {
          id: true,
          url: true,
        },
      },
    },
  })

  if (!annonce) {
    notFound()
  }

  // 5. Préparer les valeurs du formulaire.
  // Prisma Decimal et Date doivent être convertis
  // en valeurs simples pour le Client Component.
  const initialValues = {
    titre: annonce.titre,
    description: annonce.description,
    type: annonce.type,
    typePropriete: annonce.typePropriete,
    prix: annonce.prix.toString(),
    dateDisponibilite: annonce.dateDisponibilite
      .toISOString()
      .slice(0, 10),
    ville: annonce.ville,
    surface: String(annonce.surface),
    chambres: String(annonce.chambres),
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* En-tête */}
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-5xl px-6 py-10 lg:px-8">
            <Link
              href="/admin/annonces"
              className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Retour à toutes les annonces
            </Link>

            <div className="mt-6 flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                <Building2 className="size-7 text-gold" />
              </div>

              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gold">
                  <ShieldCheck className="size-4" />
                  Administration
                </p>

                <h1 className="mt-2 font-display text-3xl font-semibold">
                  Modifier une annonce
                </h1>

              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-6 px-6 py-10 lg:px-8">
          {/* Statut de publication */}
          <AnnoncePublicationSwitch
            annonceId={annonce.id}
            initialStatut={annonce.statut}
          />

          <AnnonceEtatSelector
            key={`${annonce.type}:${annonce.etat}`}
            annonceId={annonce.id}
            type={annonce.type}
            initialEtat={annonce.etat}
          />

          {/* Informations de l'annonce */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Annonce sélectionnée
                </p>

                <h2 className="mt-2 font-display text-xl font-bold">
                  {annonce.titre}
                </h2>

                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <UserRound className="size-4" />
                  Agent : {annonce.auteur.name}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    annonce.statut === "PUBLIE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {annonce.statut === "PUBLIE"
                    ? "Publiée"
                    : "Brouillon"}
                </span>

                <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {annonce.photos.length} photo(s)
                </span>
              </div>
            </div>
          </section>

          {/* Formulaire réutilisé */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <CreateAnnonceForm
              mode="edit"
              annonceId={annonce.id}
              initialValues={initialValues}
              existingPhotos={annonce.photos}
            />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
