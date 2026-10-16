
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Inbox,
  MapPin,
  MessageCircleQuestion,
  UserRound,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { ReponseQuestionForm } from "@/components/annonces/ReponseQuestionForm"

export default async function AdminQuestionsPage() {
  // Authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  // Autorisation
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Toutes les questions, quel que soit l'agent
  const questions = await prisma.question.findMany({
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
          name: true,
        },
      },
      annonce: {
        select: {
          id: true,
          titre: true,
          ville: true,
          auteur: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  // Questions sans réponse en premier
  const sortedQuestions = [
    ...questions.filter((q) => !q.reponse),
    ...questions.filter((q) => Boolean(q.reponse)),
  ]

  const total = questions.length
  const enAttente = questions.filter(
    (q) => !q.reponse,
  ).length
  const traitees = total - enAttente

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="bg-navy text-white">
          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Tableau de bord
            </Link>

            <p className="mt-7 text-xs font-bold uppercase tracking-widest text-gold">
              Administration
            </p>

            <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
              Questions clients
            </h1>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-8 px-6 py-10 lg:px-8">
          {/* Statistiques */}
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <MessageCircleQuestion className="size-6 text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Total des questions
              </p>
              <p className="mt-1 font-display text-3xl font-bold">
                {total}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <Clock3 className="size-6 text-amber-600" />
              <p className="mt-4 text-sm text-muted-foreground">
                En attente
              </p>
              <p className="mt-1 font-display text-3xl font-bold">
                {enAttente}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <CheckCircle2 className="size-6 text-emerald-600" />
              <p className="mt-4 text-sm text-muted-foreground">
                Traitées
              </p>
              <p className="mt-1 font-display text-3xl font-bold">
                {traitees}
              </p>
            </div>
          </section>

          {/* Questions */}
          <section>
            <h2 className="mb-6 font-display text-2xl font-semibold">
              Toutes les questions
            </h2>

            {sortedQuestions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
                <Inbox className="mx-auto size-10 text-muted-foreground" />
                <p className="mt-4 font-semibold">
                  Aucune question
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {sortedQuestions.map((question) => (
                  <article
                    key={question.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                  >
                    {/* Annonce */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-secondary/30 px-6 py-5">
                      <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
                          <Building2 className="size-5" />
                        </span>

                        <div>
                          <Link
                            href={`/admin/annonces/${question.annonce.id}/edit`}
                            className="font-display font-semibold hover:text-primary"
                          >
                            {question.annonce.titre}
                          </Link>

                          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="size-3.5" />
                            {question.annonce.ville}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Agent : {question.annonce.auteur.name}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          question.reponse
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {question.reponse
                          ? "Répondu"
                          : "En attente"}
                      </span>
                    </div>

                    <div className="p-6">
                      {/* Client */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <UserRound className="size-4 text-primary" />
                          <span className="text-sm font-semibold">
                            {question.auteur.name}
                          </span>
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

                      {/* Texte */}
                      <div className="mt-5 rounded-xl bg-secondary/50 p-5">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                          Question
                        </p>

                        <p className="whitespace-pre-wrap leading-7">
                          {question.texte}
                        </p>
                      </div>

                      {/* Réponse déjà enregistrée */}
                      {question.reponse && (
                        <div className="mt-4 rounded-xl border-l-4 border-gold bg-gold/10 p-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            Réponse actuelle
                          </p>

                          <p className="mt-2 whitespace-pre-wrap leading-7">
                            {question.reponse}
                          </p>
                        </div>
                      )}

                      {/* Formulaire réutilisé */}
                      <ReponseQuestionForm
                        questionId={question.id}
                        initialReponse={question.reponse}
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
