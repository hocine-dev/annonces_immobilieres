import { Navbar } from '@/components/NavBar'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { annonceIdSchema } from '@/lib/validators/interaction-annonce'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Building, MapPin, Tag } from 'lucide-react'

type EditPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditPage({ params }: EditPageProps) {
  const { id } = await params

  const parsedId = annonceIdSchema.safeParse(id)

  if (!parsedId.success) {
    notFound()
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  const annonce = await prisma.annonce.findUnique({
    where: { id: parsedId.data },
  })

  if (!annonce) {
    notFound()
  }

  // Seul l'auteur de l'annonce a accès à cette page
  if (session.user.id !== annonce.auteurId) {
    notFound()
  }

  // --- SERVER ACTION (Mise à jour de l'annonce) ---
  async function updateAnnonce(formData: FormData) {
    'use server'

    const titre = formData.get('titre') as string
    const description = formData.get('description') as string
    const ville = formData.get('ville') as string
    const prix = parseFloat(formData.get('prix') as string)
    const surface = parseInt(formData.get('surface') as string, 10)
    const chambres = parseInt(formData.get('chambres') as string, 10)
    const type = formData.get('type') as any
    const typePropriete = formData.get('typePropriete') as any
    const dateDisponibilite = new Date(formData.get('dateDisponibilite') as string)

    await prisma.annonce.update({
      where: { id: parsedId.data },
      data: {
        titre,
        description,
        ville,
        prix,
        surface,
        chambres,
        type,
        typePropriete,
        dateDisponibilite,
      },
    })

    redirect(`/agent/details/${parsedId.data}`)
  }

  // Date au format YYYY-MM-DD pour l'input date
  const defaultDateStr = annonce.dateDisponibilite.toISOString().split('T')[0]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Retour vers le détail */}
        <div>
          <Link
            href={`/details/${annonce.id}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux détails de l'annonce
          </Link>
        </div>

        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Modifier l'annonce
          </h1>
        </div>

        {/* Formulaire d'édition */}
        <form action={updateAnnonce} className="space-y-6">
          <div className="p-6 rounded-[var(--radius)] bg-card border border-border shadow-sm space-y-6">
            
            {/* Titre */}
            <div className="space-y-2">
              <label htmlFor="titre" className="text-sm font-semibold text-foreground">
                Titre de l'annonce
              </label>
              <input
                type="text"
                id="titre"
                name="titre"
                defaultValue={annonce.titre}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Types de bien et de propriété */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-semibold text-foreground">
                  Type d'opération
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue={annonce.type}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                >
                  <option value="VENTE">VENTE</option>
                  <option value="LOCATION">LOCATION</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="typePropriete" className="text-sm font-semibold text-foreground">
                  Type de propriété
                </label>
                <select
                  id="typePropriete"
                  name="typePropriete"
                  defaultValue={annonce.typePropriete}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                >
                  <option value="APPARTEMENT">APPARTEMENT</option>
                  <option value="MAISON">MAISON</option>
                  <option value="TERRAIN">TERRAIN</option>
                  <option value="LOCAL_COMMERCIAL">LOCAL COMMERCIAL</option>
                </select>
              </div>
            </div>

            {/* Prix et Ville */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="prix" className="text-sm font-semibold text-foreground">
                  Prix (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="prix"
                  name="prix"
                  defaultValue={Number(annonce.prix)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="ville" className="text-sm font-semibold text-foreground">
                  Ville
                </label>
                <input
                  type="text"
                  id="ville"
                  name="ville"
                  defaultValue={annonce.ville}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            {/* Surface, Chambres, Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="surface" className="text-sm font-semibold text-foreground">
                  Surface (m²)
                </label>
                <input
                  type="number"
                  id="surface"
                  name="surface"
                  defaultValue={annonce.surface}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="chambres" className="text-sm font-semibold text-foreground">
                  Chambres
                </label>
                <input
                  type="number"
                  id="chambres"
                  name="chambres"
                  defaultValue={annonce.chambres}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="dateDisponibilite" className="text-sm font-semibold text-foreground">
                  Date de disponibilité
                </label>
                <input
                  type="date"
                  id="dateDisponibilite"
                  name="dateDisponibilite"
                  defaultValue={defaultDateStr}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-semibold text-foreground">
                Description complète
              </label>
              <textarea
                id="description"
                name="description"
                rows={6}
                defaultValue={annonce.description}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm leading-relaxed"
              />
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/agent/details/${annonce.id}`}
              className="px-5 py-2.5 rounded-[var(--radius)] border border-border text-foreground hover:bg-muted font-medium text-sm transition-colors"
            >
              Annuler
            </Link>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[var(--radius)] bg-primary text-primary-foreground hover:opacity-90 font-medium text-sm transition-opacity cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" />
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}