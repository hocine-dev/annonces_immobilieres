import { headers } from "next/headers"
import { redirect } from "next/navigation"
import {
  Building2,
  ShieldCheck,
  UserRound,
  BriefcaseBusiness,
} from "lucide-react"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Navbar } from "@/components/NavBar"
import { Footer } from "@/components/Footer"
import { changeUserRole } from "@/actions/change-user-role"

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/")
  }

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-6xl px-4">
          {/* En-tête */}
          <div className="mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-foreground">
              Administration
            </span>

            <div className="mt-2 flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ShieldCheck className="size-6" />
              </span>

              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  Gestion des utilisateurs
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                  Gérez les agents autorisés à publier des annonces.
                </p>
              </div>
            </div>
          </div>

          {/* Liste */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="hidden grid-cols-[1fr_1fr_140px_180px] gap-4 border-b border-border bg-secondary/50 px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground md:grid">
              <span>Utilisateur</span>
              <span>Email</span>
              <span>Rôle</span>
              <span>Action</span>
            </div>

            {users.length === 0 ? (
              <div className="px-6 py-16 text-center text-muted-foreground">
                Aucun utilisateur.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_1fr_140px_180px] md:items-center"
                  >
                    {/* Utilisateur */}
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                        <UserRound className="size-5" />
                      </span>

                      <div>
                        <p className="font-semibold text-foreground">
                          {user.name}
                        </p>

                        <p className="text-xs text-muted-foreground md:hidden">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    <p className="hidden text-sm text-muted-foreground md:block">
                      {user.email}
                    </p>

                    {/* Rôle */}
                    <div>
                      {user.role === "ADMIN" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-foreground">
                          <ShieldCheck className="size-3.5" />
                          ADMIN
                        </span>
                      )}

                      {user.role === "AGENT" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          <BriefcaseBusiness className="size-3.5" />
                          AGENT
                        </span>
                      )}

                      {user.role === "USER" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                          <UserRound className="size-3.5" />
                          USER
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <div>
                      {user.role === "USER" && (
                        <form action={changeUserRole}>
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />

                          <input
                            type="hidden"
                            name="role"
                            value="AGENT"
                          />

                          <button
                            type="submit"
                            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            Promouvoir agent
                          </button>
                        </form>
                      )}

                      {user.role === "AGENT" && (
                        <form action={changeUserRole}>
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />

                          <input
                            type="hidden"
                            name="role"
                            value="USER"
                          />

                          <button
                            type="submit"
                            className="w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                          >
                            Retirer le rôle
                          </button>
                        </form>
                      )}

                      {user.role === "ADMIN" && (
                        <span className="text-sm text-muted-foreground">
                          Administrateur
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-5">
            <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />

            <p className="text-sm leading-relaxed text-muted-foreground">
              Les nouveaux comptes sont créés avec le rôle{" "}
              <strong className="text-foreground">USER</strong>. Un
              administrateur peut ensuite leur attribuer le rôle{" "}
              <strong className="text-foreground">AGENT</strong> pour leur
              permettre de gérer leurs propres annonces.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}