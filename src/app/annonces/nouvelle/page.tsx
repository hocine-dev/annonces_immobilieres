import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { CreateAnnonceForm } from "@/components/annonces/CreateAnnonceForm"

export default async function NouvelleAnnoncePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  if (
    session.user.role !== "AGENT" &&
    session.user.role !== "ADMIN"
  ) {
    redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">
              Espace agent
            </span>

            <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
              Créer une annonce
            </h1>

            <p className="mt-2 text-muted-foreground">
              Renseignez les informations du bien immobilier.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
            <CreateAnnonceForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}