import Link from "next/link"
import {
  ArrowRight,
  BedDouble,
  MapPin,
  Ruler,
} from "lucide-react"

type PropertyCardProps = {
  property: {
    id: string
    titre: string
    ville: string

    type: "VENTE" | "LOCATION"
    etat: "DISPONIBLE" | "LOUE" | "VENDU"

    typePropriete:
      | "APPARTEMENT"
      | "MAISON"
      | "VILLA"
      | "STUDIO"
      | "LOFT"

    prix: number
    surface: number
    chambres: number

    photos?: {
      id?: string
      url: string
    }[]
  }
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

function formatTypePropriete(type: string) {
  const labels: Record<string, string> = {
    APPARTEMENT: "Appartement",
    MAISON: "Maison",
    VILLA: "Villa",
    STUDIO: "Studio",
    LOFT: "Loft",
  }

  return labels[type] ?? type
}

export function PropertyCard({
  property,
}: PropertyCardProps) {
  const image =
    property.photos?.[0]?.url ??
    "/annonces/uploads/prop-maison.jpg"

  const isSold = property.etat === "VENDU"
  const isRented = property.etat === "LOUE"
  const isUnavailable = isSold || isRented

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-navy/10">
      {/* Image */}
      <Link
        href={`/annonces/${property.id}`}
        className="relative block aspect-[4/3] overflow-hidden"
      >
        <img
          src={image}
          alt={property.titre}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Marquage des biens indisponibles */}
        {isUnavailable && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <span className="rotate-[-9deg] rounded-xl border-2 border-white bg-black/65 px-7 py-3 text-2xl font-extrabold uppercase tracking-widest text-white shadow-xl">
              {isSold ? "VENDU" : "LOUÉ"}
            </span>
          </div>
        )}

        {/* Transaction */}
        <span className="absolute left-3 top-3 z-20 rounded-full bg-gold px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-navy shadow-sm">
          {property.type === "VENTE"
            ? isSold ? "Vente" : "À vendre"
            : isRented ? "Location" : "À louer"}
        </span>

        {/* Type de propriété */}
        <span className="absolute right-3 top-3 z-20 rounded-full bg-navy/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur">
          {formatTypePropriete(
            property.typePropriete,
          )}
        </span>
      </Link>

      {/* Contenu */}
      <div className="flex flex-1 flex-col p-5">
        {/* Prix */}
        <p className="font-display text-xl font-bold text-primary">
          {formatPrix(
            Number(property.prix),
            property.type,
          )}
        </p>

        {/* Titre */}
        <Link
          href={`/annonces/${property.id}`}
          className="mt-1"
        >
          <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {property.titre}
          </h3>
        </Link>

        {/* Ville */}
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary" />

          <span>{property.ville}</span>
        </p>

        {/* Caractéristiques */}
        <div className="mt-5 flex items-center gap-5 border-t border-border/60 pt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-4 text-primary" />

            {property.chambres}{" "}
            {property.chambres > 1
              ? "chambres"
              : "chambre"}
          </span>

          <span className="flex items-center gap-1.5">
            <Ruler className="size-4 text-primary" />

            {property.surface} m²
          </span>
        </div>

        {/* Bouton */}
        <div className="mt-auto pt-5">
          <Link
            href={`/annonces/${property.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
          >
            Voir le bien

            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </article>
  )
}