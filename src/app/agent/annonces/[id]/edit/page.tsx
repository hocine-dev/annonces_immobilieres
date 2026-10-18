import { Navbar } from '@/components/NavBar'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { annonceIdSchema } from '@/lib/validators/interaction-annonce'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Save, Trash2, Upload } from 'lucide-react'
import { EditValidationForm, EditFieldError } from "./EditValidationForm"

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
    include: { photos: true },
  })

  if (!annonce) {
    notFound()
  }

  // Seul l'auteur de l'annonce a accès à cette page
  if (session.user.id !== annonce.auteurId) {
    notFound()
  }

  // Liaison de l'action serveur avec l'ID de l'annonce

  // Date au format YYYY-MM-DD pour l'input date
  const defaultDateStr = annonce.dateDisponibilite.toISOString().split('T')[0]

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Retour vers le détail */}
        <div>
          <Link
            href={`/agent/annonces/${annonce.id}`}
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

        {/* Formulaire d'édition (encType nécessaire pour le transfert de fichiers) */}
        <EditValidationForm annonceId={parsedId.data}>
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
              aria-describedby="titre-error" />
              <EditFieldError name="titre" />
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
                 aria-describedby="type-error">
                  <option value="VENTE">VENTE</option>
                  <option value="LOCATION">LOCATION</option>
                </select>
                <EditFieldError name="type" />
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
                 aria-describedby="typePropriete-error">
                  <option value="APPARTEMENT">APPARTEMENT</option>
                  <option value="MAISON">MAISON</option>
                  <option value="VILLA">VILLA</option>
                  <option value="STUDIO">STUDIO</option>
                  <option value="LOFT">LOFT</option>
                </select>
                <EditFieldError name="typePropriete" />
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
                  min={1}
                  defaultValue={Number(annonce.prix)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                aria-describedby="prix-error" />
                <EditFieldError name="prix" />
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
                aria-describedby="ville-error" />
                <EditFieldError name="ville" />
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
                aria-describedby="surface-error" />
                <EditFieldError name="surface" />
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
                aria-describedby="chambres-error" />
                <EditFieldError name="chambres" />
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
                aria-describedby="dateDisponibilite-error" />
                <EditFieldError name="dateDisponibilite" />
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
              aria-describedby="description-error" />
              <EditFieldError name="description" />
            </div>

            {/* GESTION DES PHOTOS */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h2 className="text-base font-semibold text-foreground">Gestion des photos</h2>

              {/* Photos existantes avec option de suppression */}
              {annonce.photos && annonce.photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Cochez les photos que vous souhaitez supprimer :
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {annonce.photos.map((photo) => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border bg-muted p-2 flex flex-col items-center gap-2">
                        <div className="relative w-full h-28 rounded-md overflow-hidden">
                          <Image
                            src={photo.url}
                            alt="Photo de l'annonce"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <label className="flex items-center gap-1.5 text-xs text-destructive cursor-pointer font-medium">
                          <input
                            type="checkbox"
                            name="deletePhotos"
                            value={photo.id}
                            className="rounded border-input text-destructive focus:ring-destructive"
                          />
                          <Trash2 className="w-3.5 h-3.5" />
                          Supprimer
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <EditFieldError name="deletePhotos" />
              {/* Téléversement de nouvelles photos */}
              <div className="space-y-2">
                <label htmlFor="newPhotos" className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  Ajouter de nouvelles photos
                </label>
                <input
                  type="file"
                  id="newPhotos"
                  name="newPhotos"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:opacity-90 cursor-pointer border border-input rounded-lg p-1.5"
                aria-describedby="newPhotos-error" />
                <EditFieldError name="newPhotos" />
              </div>
            </div>

          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/agent/annonces/${annonce.id}`}
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
        </EditValidationForm>
      </main>
    </div>
  )
}