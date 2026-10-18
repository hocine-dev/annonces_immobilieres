import { MessageCircleQuestion, UserRound } from "lucide-react"

import { prisma } from "@/lib/prisma"

type QuestionsAnnonceProps = {
  annonceId: string
}

/**
 * Composant SERVEUR asynchrone : le détail de l'annonce peut s'afficher
 * pendant que cette requête Prisma est en attente. Le délai de 2 secondes
 * simule un réseau lent uniquement en développement (démonstration TP).
 */
export async function QuestionsAnnonce({ annonceId }: QuestionsAnnonceProps) {
  if (process.env.NODE_ENV === "development") {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000))
  }

  const questions = await prisma.question.findMany({
    where: { annonceId },
    orderBy: { createdAt: "desc" },
    include: {
      auteur: {
        select: { id: true, name: true },
      },
    },
  })

  return (
    <>
            {/* Questions */}
            <section className="py-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MessageCircleQuestion className="size-5" />
                </div>

                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    Questions sur ce bien
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {questions.length} question
                    {questions.length > 1
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border p-8 text-center text-muted-foreground">
                  Aucune question pour le moment.
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map(
                    (question) => (
                      <article
                        key={question.id}
                        className="rounded-3xl border border-border bg-card p-6 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <UserRound className="size-4" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold">
                              {
                                question.auteur
                                  .name
                              }
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {question.createdAt.toLocaleDateString(
                                "fr-FR",
                              )}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 leading-7">
                          {question.texte}
                        </p>

                        {question.reponse ? (
                          <div className="mt-5 rounded-2xl border-l-4 border-gold bg-gold/10 p-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                              Réponse de l'agent
                            </p>

                            <p className="mt-2 leading-7 text-foreground">
                              {question.reponse}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm italic text-muted-foreground">
                            En attente d'une réponse de l'agent.
                          </p>
                        )}
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>
    </>
  )
}

/** Le fallback est envoyé au navigateur pendant la suspension. */
export function QuestionsSkeleton() {
  return (
    <section className="py-8" role="status" aria-live="polite" aria-busy="true">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircleQuestion className="size-5" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold">
            Questions sur ce bien
          </h2>
          <p className="text-sm text-muted-foreground">
            Chargement des questions (simulation : 2 secondes)...
          </p>
        </div>
      </div>
      <div className="space-y-4" aria-hidden="true">
        {[0, 1].map((item) => (
          <div key={item} className="animate-pulse rounded-3xl border border-border bg-card p-6">
            <div className="h-4 w-2/5 rounded bg-muted" />
            <div className="mt-5 h-3 w-full rounded bg-muted" />
            <div className="mt-2 h-3 w-4/5 rounded bg-muted" />
          </div>
        ))}
      </div>
    </section>
  )
}
