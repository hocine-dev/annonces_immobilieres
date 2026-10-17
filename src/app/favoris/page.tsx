import { Navbar } from '@/components/NavBar'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Bed, Maximize2, Heart, Building, Home } from 'lucide-react'

export default async function Favoris() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  const userId = session.user.id

  // Récupération de tous les favoris de l'utilisateur avec les données de l'annonce et ses photos
  const favoris = await prisma.favori.findMany({
    where: {
      userId: userId,
    },
    include: {
      annonce: {
        include: {
          photos: true,
        },
      },
    },
    orderBy: {
      // Optionnel : afficher les favoris les plus récents en premier
      id: 'desc',
    },
  })

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* En-tête de la page */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Heart className="w-7 h-7 text-destructive fill-destructive" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Mes Favoris ({favoris.length})
            </h1>
          </div>
        </div>

        {/* Liste des favoris */}
        {favoris.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-[var(--radius)] border border-border space-y-4">
            <Heart className="w-16 h-16 text-muted-foreground/40" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Aucun favori pour le moment</h2>
              <p className="text-sm text-muted-foreground">
                Explorez nos annonces et cliquez sur le cœur pour ajouter des biens à vos favoris.
              </p>
            </div>
            <Link
              href="/annonces"
              className="mt-4 px-5 py-2.5 rounded-[var(--radius)] bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Découvrir les annonces
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoris.map((favori) => {
              const annonce = favori.annonce
              const photoPrincipale = annonce.photos && annonce.photos.length > 0 ? annonce.photos[0].url : null

              const prixFormate = new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(Number(annonce.prix))

              return (
                <Link
                  key={favori.id}
                  href={`/annonces/${annonce.id}`}
                  className="group bg-card border border-border rounded-[var(--radius)] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer"
                >
                  {/* Image de l'annonce */}
                  <div className="relative w-full h-48 bg-muted overflow-hidden">
                    {photoPrincipale ? (
                      <Image
                        src={photoPrincipale}
                        alt={annonce.titre}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Home className="w-10 h-10 mb-1" />
                        <span className="text-xs">Pas de photo</span>
                      </div>
                    )}

                    {/* Badge type d'opération */}
                    <div className="absolute top-3 left-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm text-foreground border border-border shadow-sm">
                        {annonce.type}
                      </span>
                    </div>
                  </div>

                  {/* Contenu texte */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-medium text-primary">
                          <Building className="w-3.5 h-3.5" />
                          {annonce.typePropriete}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {annonce.ville}
                        </span>
                      </div>

                      <h2 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {annonce.titre}
                      </h2>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      {/* Prix */}
                      <p className="text-xl font-extrabold text-primary">
                        {prixFormate}
                      </p>

                      {/* Caractéristiques principales */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5" />
                          {annonce.surface} m²
                        </span>
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5" />
                          {annonce.chambres}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}