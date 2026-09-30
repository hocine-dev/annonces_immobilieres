import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  HelpCircle,
  Inbox,
  Mail,
  MapPin,
  MessageCircleQuestion,
  UserRound,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"

import { ReponseQuestionForm } from "@/components/annonces/ReponseQuestionForm"

export default async function AgentQuestionsPage() {
  /*
   * Authentification
   */
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  /*
   * Autorisation.
   *
   * Un USER n'a rien à faire dans l'espace agent.
   *
   * ADMIN possède tous les droits.
   */
  if (
    session.user.role !== "AGENT" &&
    session.user.role !== "ADMIN"
  ) {
    redirect("/dashboard")
  }

  /*
   * Un AGENT récupère uniquement les questions
   * liées à SES annonces.
   *
   * Un ADMIN peut voir toutes les questions.
   */
  const questions =
    await prisma.question.findMany({
      where:
        session.user.role === "ADMIN"
          ? {}
          : {
              annonce: {
                auteurId: session.user.id,
              },
            },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        texte: true,
        reponse: true,
        createdAt: true,

        auteur: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        annonce: {
          select: {
            id: true,
            titre: true,
            ville: true,
          },
        },
      },
    })

  /*
   * Les questions en attente apparaissent
   * avant les questions déjà traitées.
   */
  const sortedQuestions = [
    ...questions.filter(
      (question) => !question.reponse,
    ),

    ...questions.filter(
      (question) => question.reponse,
    ),
  ]

  const totalQuestions = questions.length

  const questionsEnAttente =
    questions.filter(
      (question) => !question.reponse,
    ).length

  const questionsTraitees =
    totalQuestions - questionsEnAttente

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <Link
              href={
                session.user.role === "ADMIN"
                  ? "/admin/dashboard"
                  : "/agent/dashboard"
              }
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="size-4" />

              Retour au tableau de bord
            </Link>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">
                  Espace professionnel
                </span>

                <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
                  Questions clients
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">
                  Consultez et répondez aux questions
                  concernant vos biens immobiliers.
                </p>
              </div>

              {questionsEnAttente > 0 && (
                <div className="flex w-fit items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold">
                  <Clock3 className="size-4" />

                  {questionsEnAttente} en attente
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          {/* Statistiques */}
          <section className="mb-10 grid gap-5 sm:grid-cols-3">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCircleQuestion className="size-5" />
                </div>

                <span className="font-display text-3xl font-semibold">
                  {totalQuestions}
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold">
                Questions reçues
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Toutes les demandes de vos clients.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Clock3 className="size-5" />
                </div>

                <span className="font-display text-3xl font-semibold">
                  {questionsEnAttente}
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold">
                En attente
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Questions nécessitant une réponse.
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="size-5" />
                </div>

                <span className="font-display text-3xl font-semibold">
                  {questionsTraitees}
                </span>
              </div>

              <p className="mt-5 text-sm font-semibold">
                Traitées
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Questions auxquelles vous avez répondu.
              </p>
            </div>
          </section>

          {/* Liste */}
          <section>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-semibold">
                Demandes reçues
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Les questions non traitées apparaissent
                en premier.
              </p>
            </div>

            {sortedQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Inbox className="size-7" />
                </div>

                <h3 className="mt-5 font-display text-xl font-semibold">
                  Aucune question
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Vous n'avez reçu aucune question sur
                  vos annonces pour le moment.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedQuestions.map(
                  (question) => (
                    <article
                      key={question.id}
                      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                    >
                      {/* Bien concerné */}
                      <div className="flex flex-col gap-4 border-b border-border bg-secondary/30 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">
                            <Building2 className="size-5" />
                          </div>

                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                              Bien concerné
                            </p>

                            <h3 className="mt-1 font-display font-semibold">
                              {question.annonce.titre}
                            </h3>

                            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="size-3.5" />

                              {question.annonce.ville}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {question.reponse ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="size-3.5" />

                              Répondu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                              <Clock3 className="size-3.5" />

                              En attente
                            </span>
                          )}

                          <Link
                            href={`/annonces/${question.annonce.id}`}
                            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"
                            title="Voir l'annonce"
                          >
                            <ExternalLink className="size-4" />
                          </Link>
                        </div>
                      </div>

                      <div className="p-6">
                        {/* Client */}
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <UserRound className="size-5" />
                            </div>

                            <div>
                              <p className="text-sm font-semibold">
                                {question.auteur.name}
                              </p>

                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Mail className="size-3" />

                                {question.auteur.email}
                              </p>
                            </div>
                          </div>

                          <time className="text-xs text-muted-foreground">
                            {question.createdAt.toLocaleDateString(
                              "fr-FR",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </time>
                        </div>

                        {/* Question */}
                        <div className="mt-6 rounded-2xl bg-secondary/50 p-5">
                          <div className="mb-2 flex items-center gap-2">
                            <HelpCircle className="size-4 text-primary" />

                            <span className="text-xs font-bold uppercase tracking-[0.1em] text-primary">
                              Question
                            </span>
                          </div>

                          <p className="leading-7 text-foreground">
                            {question.texte}
                          </p>
                        </div>

                        {/* Réponse existante */}
                        {question.reponse && (
                          <div className="mt-4 rounded-2xl border-l-4 border-gold bg-gold/10 p-5">
                            <p className="text-xs font-bold uppercase tracking-[0.1em] text-amber-700">
                              Votre réponse actuelle
                            </p>

                            <p className="mt-2 leading-7">
                              {question.reponse}
                            </p>
                          </div>
                        )}

                        {/* Formulaire */}
                        <ReponseQuestionForm
                          questionId={question.id}
                          initialReponse={
                            question.reponse
                          }
                        />
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}