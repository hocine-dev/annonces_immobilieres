import { Navbar } from '@/components/NavBar'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MessageSquare, CheckCircle2, Clock, Building, MapPin, ExternalLink, HelpCircle } from 'lucide-react'

export default async function MesQuestionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  // Récupération des questions posées par le client connecté
  const questions = await prisma.question.findMany({
    where: {
      auteurId: session.user.id,
    },
    include: {
      annonce: {
        include: {
          photos: {
            take: 1, // On récupère juste la première photo pour la vignette
          },
          auteur: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-7 h-7 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Mes Questions Posées ({questions.length})
            </h1>
          </div>
        </div>

        {/* Liste des questions */}
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-[var(--radius)] border border-border space-y-4">
            <HelpCircle className="w-16 h-16 text-muted-foreground/40" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Vous n'avez posé aucune question</h2>
              <p className="text-sm text-muted-foreground">
                Lorsque vous poserez des questions sur une annonce, leurs réponses apparaîtront ici.
              </p>
            </div>
            <Link
              href="/annonces"
              className="mt-4 px-5 py-2.5 rounded-[var(--radius)] bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Parcourir les annonces
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => {
              const annonce = q.annonce
              const photo = annonce.photos[0]?.url

              return (
                <div
                  key={q.id}
                  className="bg-card border border-border rounded-[var(--radius)] overflow-hidden shadow-sm p-5 space-y-4"
                >
                  {/* En-tête de la carte : Infos sur l'Annonce */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                      {photo ? (
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                          <Image
                            src={photo}
                            alt={annonce.titre}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                          <Building className="w-6 h-6" />
                        </div>
                      )}

                      <div>
                        <Link
                          href={`/annonces/${annonce.id}`}
                          className="font-bold text-base hover:text-primary transition-colors flex items-center gap-1.5 line-clamp-1"
                        >
                          {annonce.titre}
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </Link>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {annonce.ville} • Publié par {annonce.auteur.name || 'Agent'}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/annonces/${annonce.id}`}
                      className="text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap self-end sm:self-center"
                    >
                      Voir l'annonce
                    </Link>
                  </div>

                  {/* Bloc Question du Client */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Votre question :</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(q.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg border border-border/50 whitespace-pre-line">
                      {q.texte}
                    </p>
                  </div>

                  {/* Bloc Réponse de l'Agent */}
                  {q.reponse ? (
                    <div className="space-y-1.5 pl-2 border-l-2 border-primary">
                      <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Réponse de l'agent ({annonce.auteur.name}) :
                      </span>
                      <p className="text-sm text-foreground bg-primary/5 p-3 rounded-lg border border-primary/10 whitespace-pre-line">
                        {q.reponse}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>En attente de réponse de l'agent...</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}