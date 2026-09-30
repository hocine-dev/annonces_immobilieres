import Link from "next/link"
import { Building2, CheckCircle2 } from "lucide-react"

import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { RegisterForm } from "@/components/auth/RegisterForm"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex flex-1 items-center py-12 sm:py-16">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-navy/5 lg:grid-cols-2">

            {/* Partie marque */}
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
                    Rejoignez-nous
                  </span>

                  <h1 className="mt-5 font-display text-4xl font-bold leading-tight">
                    Votre projet immobilier commence ici.
                  </h1>

                  <p className="mt-5 leading-relaxed text-navy-foreground/75">
                    Créez gratuitement votre compte et profitez des
                    fonctionnalités personnalisées d&apos;Horizon Immo.
                  </p>
                </div>
              </div>

              <div className="relative space-y-3 text-sm text-navy-foreground/80">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-gold" />
                  Enregistrez vos annonces favorites
                </p>

                <p className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-gold" />
                  Posez vos questions aux agents
                </p>

                <p className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-gold" />
                  Compte gratuit et sécurisé
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
                    Bienvenue chez Horizon Immo
                  </span>

                  <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
                    Créer un compte
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Quelques secondes suffisent pour rejoindre Horizon Immo.
                  </p>
                </div>

                <div className="mt-8">
                  <RegisterForm />
                </div>

                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Vous avez déjà un compte ?{" "}
                  <Link
                    href="/login"
                    className="font-bold text-primary transition-colors hover:text-primary/80"
                  >
                    Se connecter
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