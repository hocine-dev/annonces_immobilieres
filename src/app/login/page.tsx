import Link from "next/link"
import { Building2, CheckCircle2 } from "lucide-react"

import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex flex-1 items-center py-12 sm:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-navy/5 lg:grid-cols-2">
            
            {/* Partie identité Horizon Immo */}
            <section className="relative hidden overflow-hidden bg-navy p-10 text-navy-foreground lg:flex lg:flex-col lg:justify-between">
              <div className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-gold/10 blur-3xl" />

              <div className="relative">
                <Link href="/" className="inline-flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-gold text-gold-foreground">
                    <Building2 className="size-6" />
                  </span>

                  <span className="font-display text-xl font-bold">
                    Horizon<span className="text-gold">Immo</span>
                  </span>
                </Link>

                <div className="mt-16 max-w-md">
                  <span className="inline-flex rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-gold">
                    Espace personnel
                  </span>

                  <h1 className="mt-5 font-display text-4xl font-bold leading-tight">
                    Retrouvez vos projets immobiliers.
                  </h1>

                  <p className="mt-5 leading-relaxed text-navy-foreground/75">
                    Connectez-vous pour gérer vos favoris, poser vos questions
                    et accéder aux fonctionnalités réservées aux membres.
                  </p>
                </div>
              </div>

              <div className="relative space-y-3 text-sm text-navy-foreground/80">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-gold" />
                  Annonces immobilières vérifiées
                </p>

                <p className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-gold" />
                  Favoris et questions centralisés
                </p>

                <p className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-gold" />
                  Espace sécurisé
                </p>
              </div>
            </section>

            {/* Formulaire */}
            <section className="flex items-center p-6 sm:p-10 lg:p-14">
              <div className="mx-auto w-full max-w-md">
                <div className="lg:hidden">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Building2 className="size-6" />
                  </span>
                </div>

                <div className="mt-6 lg:mt-0">
                  <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">
                    Heureux de vous revoir
                  </span>

                  <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
                    Connexion
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Accédez à votre compte Horizon Immo.
                  </p>
                </div>

                <div className="mt-8">
                  <LoginForm />
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Pas encore de compte ?{" "}
                  <Link
                    href="/register"
                    className="font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    Créer un compte
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}