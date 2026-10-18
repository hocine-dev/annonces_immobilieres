export const dynamic = "force-dynamic"

import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { PropertyList } from "@/components/PropertyList"
import { SearchBar } from "@/components/SearchBar"

import { prisma } from "@/lib/prisma"
import { searchAnnonceSchema } from "@/lib/validators/search-annonce"

type AnnoncesPageProps = {
  searchParams: Promise<{
    ville?: string | string[]
    type?: string | string[]
    prixMin?: string | string[]
    prixMax?: string | string[]
  }>
}

export default async function AnnoncesPage({
  searchParams,
}: AnnoncesPageProps) {
  const params = await searchParams

  const rawFilters = {
    ville:
      typeof params.ville === "string"
        ? params.ville
        : undefined,

    type:
      typeof params.type === "string"
        ? params.type
        : undefined,

    prixMin:
      typeof params.prixMin === "string"
        ? params.prixMin
        : undefined,

    prixMax:
      typeof params.prixMax === "string"
        ? params.prixMax
        : undefined,
  }

  const result =
    searchAnnonceSchema.safeParse(rawFilters)

  if (!result.success) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />

        <main className="flex-1">
          <section className="bg-navy py-14 text-white">
            <div className="mx-auto max-w-6xl px-4">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
                Horizon Immo
              </span>

              <h1 className="mt-2 font-display text-3xl font-bold">
                Rechercher un bien
              </h1>

              <div className="mt-8">
                <SearchBar
                  defaultValues={rawFilters}
                />
              </div>
            </div>
          </section>

          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
              {result.error.issues[0]?.message ??
                "Les critères de recherche sont invalides."}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  const filters = result.data

  const annonces = await prisma.annonce.findMany({
    where: {
      statut: "PUBLIE",

      ...(filters.ville && {
        ville: filters.ville,
      }),

      ...(filters.type && {
        type: filters.type,
      }),

      ...((filters.prixMin !== undefined ||
        filters.prixMax !== undefined) && {
        prix: {
          ...(filters.prixMin !== undefined && {
            gte: filters.prixMin,
          }),

          ...(filters.prixMax !== undefined && {
            lte: filters.prixMax,
          }),
        },
      }),
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      photos: true,
    },
  })

  /*
   * On ne transmet pas directement les objets Prisma
   * au Client Component, notamment à cause de Decimal.
   */
  const properties = annonces.map((annonce) => ({
    id: annonce.id,
    titre: annonce.titre,
    description: annonce.description,

    type: annonce.type,
    typePropriete: annonce.typePropriete,

    prix: Number(annonce.prix),

    ville: annonce.ville,
    surface: annonce.surface,
    chambres: annonce.chambres,

    photos: annonce.photos.map((photo) => ({
      id: photo.id,
      url: photo.url,
    })),
  }))

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* En-tête recherche */}
        <section className="bg-navy py-14 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
              Horizon Immo
            </span>

            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl font-bold md:text-4xl">
                  Trouvez votre prochain bien
                </h1>

                <p className="mt-2 text-white/70">
                  Affinez votre recherche selon vos critères.
                </p>
              </div>

              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold">
                {properties.length}{" "}
                {properties.length > 1
                  ? "biens trouvés"
                  : "bien trouvé"}
              </span>
            </div>

            <div className="mt-8">
              <SearchBar
                defaultValues={{
                  ville: rawFilters.ville,
                  type: rawFilters.type,
                  prixMin: rawFilters.prixMin,
                  prixMax: rawFilters.prixMax,
                }}
              />
            </div>
          </div>
        </section>

        <PropertyList properties={properties} />
      </main>

      <Footer />
    </div>
  )
}