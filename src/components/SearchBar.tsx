import { MapPin, Search, KeyRound } from "lucide-react"

import { prisma } from "@/lib/prisma"

type SearchBarProps = {
  defaultValues?: {
    ville?: string
    type?: string
    prixMin?: string
    prixMax?: string
  }
}

export async function SearchBar({
  defaultValues = {},
}: SearchBarProps) {
  const villes = await prisma.annonce.findMany({
    where: {
      statut: "PUBLIE",
    },
    select: {
      ville: true,
    },
    distinct: ["ville"],
    orderBy: {
      ville: "asc",
    },
  })

  const fieldClass =
    "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30"

  return (
    <form
      action="/annonces"
      method="GET"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200/60 bg-white p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_.9fr_.9fr_auto]"
    >
      {/* Ville */}
      <label className="relative block">
        <span className="sr-only">Ville</span>

        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />

        <select
          name="ville"
          defaultValue={defaultValues.ville ?? ""}
          className={`${fieldClass} pl-9`}
        >
          <option value="">Toutes les villes</option>

          {villes.map(({ ville }) => (
            <option key={ville} value={ville}>
              {ville}
            </option>
          ))}
        </select>
      </label>

      {/* Vente / Location */}
      <label className="relative block">
        <span className="sr-only">Type de transaction</span>

        <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />

        <select
          name="type"
          defaultValue={defaultValues.type ?? ""}
          className={`${fieldClass} pl-9`}
        >
          <option value="">Vente & location</option>
          <option value="VENTE">À vendre</option>
          <option value="LOCATION">À louer</option>
        </select>
      </label>

      {/* Prix minimum */}
      <label>
        <span className="sr-only">Prix minimum</span>

        <input
          type="number"
          name="prixMin"
          min="0"
          step="1"
          defaultValue={defaultValues.prixMin ?? ""}
          placeholder="Prix min."
          className={fieldClass}
        />
      </label>

      {/* Prix maximum */}
      <label>
        <span className="sr-only">Prix maximum</span>

        <input
          type="number"
          name="prixMax"
          min="0"
          step="1"
          defaultValue={defaultValues.prixMax ?? ""}
          placeholder="Prix max."
          className={fieldClass}
        />
      </label>

      {/* Recherche */}
      <button
        type="submit"
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-gold px-6 text-sm font-bold text-navy shadow-sm transition-colors hover:bg-gold/90"
      >
        <Search className="size-4" />
        Rechercher
      </button>
    </form>
  )
}