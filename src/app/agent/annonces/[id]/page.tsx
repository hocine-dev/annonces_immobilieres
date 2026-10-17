import { Navbar } from '@/components/NavBar'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { annonceIdSchema } from '@/lib/validators/interaction-annonce'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import React, { Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  MapPin, 
  Bed, 
  Maximize2, 
  Home, 
  User, 
  MessageSquare, 
  Building, 
  Clock, 
  Pencil, 
  ShieldCheck,
  Tag
} from 'lucide-react'
import { updateStatutPublication, updateEtatBien, deleteAnnonce } from './actions'
import { ToastListener } from './ToastListener'
import { DeleteButton } from './DeleteButton'

type DetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function DetailsPage({
  params,
}: DetailsPageProps) {
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
  if (!session?.user) {
    redirect('/login')
  }

  // Récupération complète avec l'auteur et les questions
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
          email: true,
          image: true,
        },
      },
      questions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!annonce) {
    notFound()
  }

  // Vérification si l'utilisateur connecté est le publieur / agent
  const isOwner = session?.user?.id === annonce.auteurId
  if (!isOwner) {
    notFound()
  }

  // Formateurs
  const prixFormate = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(annonce.prix))

  const dateDispo = new Date(annonce.dateDisponibilite).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Liaison des IDs aux Server Actions
  const handleUpdateStatut = updateStatutPublication.bind(null, parsedId.data)
  const handleUpdateEtat = updateEtatBien.bind(null, parsedId.data)
  const handleDelete = deleteAnnonce.bind(null, parsedId.data)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Suspense fallback={null}>
        <ToastListener />
      </Suspense>

      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Bandeau d'administration réservé au publieur / agent */}
        {isOwner && (
          <div className="bg-secondary text-secondary-foreground border border-border p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Espace Gestionaire de l'Annonce</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Formulaire Statut Publication (Brouillon / Publié) */}
              <form action={handleUpdateStatut} className="flex items-center gap-2">
                <label htmlFor="statut" className="text-xs font-medium text-muted-foreground">
                  Statut :
                </label>
                <select
                  id="statut"
                  name="statut"
                  defaultValue={annonce.statut}
                  className="text-xs bg-card text-card-foreground border border-input rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="BROUILLON">BROUILLON</option>
                  <option value="PUBLIE">PUBLIÉ</option>
                </select>
                <button
                  type="submit"
                  className="text-xs bg-primary text-primary-foreground hover:opacity-90 px-3 py-1.5 rounded-lg font-medium transition-opacity cursor-pointer"
                >
                  Appliquer
                </button>
              </form>

              {/* Formulaire État du Bien (Disponible / Loué / Vendu) */}
              <form action={handleUpdateEtat} className="flex items-center gap-2">
                <label htmlFor="etat" className="text-xs font-medium text-muted-foreground">
                  État :
                </label>
                <select
                  id="etat"
                  name="etat"
                  defaultValue={annonce.etat}
                  className="text-xs bg-card text-card-foreground border border-input rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  {annonce.type.toUpperCase() !== "VENTE" && <option value="LOUE">LOUÉ</option> }
                  <option value="VENDU">VENDU</option>
                </select>
                <button
                  type="submit"
                  className="text-xs bg-primary text-primary-foreground hover:opacity-90 px-3 py-1.5 rounded-lg font-medium transition-opacity cursor-pointer"
                >
                  Appliquer
                </button>
              </form>
            </div>
          </div>
        )}

        {/* En-tête de l'annonce */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="inline-flex items-center gap-1 font-medium text-primary bg-secondary px-3 py-1 rounded-full border border-border">
                <Building className="w-3.5 h-3.5" />
                {annonce.type}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {annonce.ville}
              </span>
              <span>•</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground border border-border">
                {annonce.statut}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
              {annonce.titre}
            </h1>
          </div>

          <div className="text-left md:text-right">
            <p className="text-3xl font-black text-primary">
              {prixFormate}
            </p>
            <p className="text-xs text-muted-foreground">Disponible le {dateDispo}</p>
          </div>
        </div>

        {/* Galerie Photos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[400px] rounded-[var(--radius)] overflow-hidden shadow-sm border border-border">
          {annonce.photos && annonce.photos.length > 0 ? (
            <>
              <div className="md:col-span-2 relative h-full bg-muted">
                <Image
                  src={annonce.photos[0].url}
                  alt={annonce.titre}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  priority
                />
              </div>
              <div className="hidden md:grid grid-rows-2 gap-4 h-full">
                {annonce.photos.slice(1, 3).map((photo, index) => (
                  <div key={photo.id || index} className="relative h-full bg-muted overflow-hidden">
                    <Image
                      src={photo.url}
                      alt={`${annonce.titre} ${index + 2}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
                {annonce.photos.length < 2 && (
                  <div className="bg-card flex items-center justify-center text-muted-foreground text-sm">
                    Pas d'autres photos
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="col-span-3 bg-card flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Home className="w-12 h-12" />
              <p>Aucune photo disponible</p>
            </div>
          )}
        </div>

        {/* Contenu & Panneau latéral */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne Gauche : Spécifications, Description, Questions */}
          <div className="lg:col-span-2 space-y-8">
            {/* Badges Caractéristiques */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-[var(--radius)] bg-card border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-secondary text-primary">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Surface</p>
                  <p className="font-semibold text-foreground">{annonce.surface} m²</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-secondary text-primary">
                  <Bed className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chambres</p>
                  <p className="font-semibold text-foreground">{annonce.chambres}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-secondary text-primary">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Propriété</p>
                  <p className="font-semibold text-foreground">{annonce.typePropriete}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-secondary text-primary">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">État bien</p>
                  <p className="font-semibold text-foreground">{annonce.etat}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="p-6 rounded-[var(--radius)] bg-card border border-border shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-foreground">Description du bien</h2>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {annonce.description}
              </p>
            </div>

            {/* Questions reçues */}
            <div className="p-6 rounded-[var(--radius)] bg-card border border-border shadow-sm space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <MessageSquare className="w-5 h-5 text-primary" />
                Questions ({annonce.questions ? annonce.questions.length : 0})
              </h2>

              {annonce.questions && annonce.questions.length > 0 ? (
                <div className="space-y-4">
                  {annonce.questions.map((q) => (
                    <div key={q.id} className="p-4 rounded-lg bg-muted space-y-2">
                      <p className="font-medium text-sm text-foreground">{''}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune question posée pour le moment.
                </p>
              )}
            </div>
          </div>

          {/* Colonne Droite : Auteur & Actions d'Édition / Suppression */}
          <div className="space-y-6">
            <div className="sticky top-24 p-6 rounded-[var(--radius)] bg-card border border-border shadow-sm space-y-6">
              {/* Infos Auteur */}
              <div className="flex items-center gap-4 pb-4 border-b border-border">
                {annonce.auteur.image ? (
                  <Image
                    src={annonce.auteur.image}
                    alt={annonce.auteur.name || 'Agent'}
                    width={56}
                    height={56}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-lg">
                    {annonce.auteur.name?.charAt(0) || <User className="w-6 h-6" />}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-foreground">{annonce.auteur.name}</h3>
                  <p className="text-xs text-muted-foreground">Publieur / Agent</p>
                </div>
              </div>

              {/* Actions réservées au publieur */}
              {isOwner ? (
                <div className="space-y-3">
                  <Link
                    href={`/agent/annonces/${annonce.id}/edit`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:opacity-90 text-primary-foreground font-medium rounded-[var(--radius)] transition-opacity shadow-sm cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    Modifier l'annonce
                  </Link>

                  <DeleteButton action={handleDelete} />
                </div>
              ) : (
                <a
                  href={`mailto:${annonce.auteur.email}?subject=Annonce : ${encodeURIComponent(annonce.titre)}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:opacity-90 text-primary-foreground font-medium rounded-[var(--radius)] transition-opacity shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contacter le publieur
                </a>
              )}

              <div className="pt-2 text-xs text-center text-muted-foreground">
                Créée le {new Date(annonce.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}