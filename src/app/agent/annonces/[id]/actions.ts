"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import { z } from "zod"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  uploadAnnoncePhoto,
  deleteAnnoncePhoto,
} from "@/lib/photo-storage"

const idSchema = z.string().min(1).max(128)
const statutSchema = z.enum(["BROUILLON", "PUBLIE"])
const etatSchema = z.enum(["DISPONIBLE", "LOUE", "VENDU"])

const moneySchema = z.string().trim().min(1).transform(Number).pipe(z.number().finite().positive().max(999999999))
const positiveIntegerSchema = z.string().trim().min(1).transform(Number).pipe(z.number().int().positive())
const nonnegativeIntegerSchema = z.string().trim().min(1).transform(Number).pipe(z.number().int().min(0))

const annonceSchema = z.object({
  titre: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10),
  ville: z.string().trim().min(2).max(120),
  prix: moneySchema,
  surface: positiveIntegerSchema,
  chambres: nonnegativeIntegerSchema,
  type: z.enum(["VENTE", "LOCATION"]),
  typePropriete: z.enum(["APPARTEMENT", "MAISON", "VILLA", "STUDIO", "LOFT"]),
  dateDisponibilite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((s) => new Date(`${s}T00:00:00.000Z`)).refine((d) => !Number.isNaN(d.getTime()), "Date invalide"),
})

type AnnonceScope = {
  id: string
  auteurId: string
  type: "VENTE" | "LOCATION"
  actorId: string
  admin: boolean
}

// Authentification -> autorisation -> validation du formulaire (Zod).
async function authorizedAnnonce(annonceId: string): Promise<AnnonceScope> {

  // Récupérer et vérifier la session  à partir des en-têtes HTTP via Better Auth.

  const session = await auth.api.getSession(
    { headers: await headers() }
  )
  // Si la session est absente ou ne contient aucun utilisateur, rediriger vers la page de connexion.
  if (!session?.user) redirect("/login")

  // Vérifier si l'utilisateur est administrateur.

  const admin = session.user.role === "ADMIN"

  // Refuser l'accès si l'utilisateur n'est ni AGENT ni ADMIN (erreur 404).

  if (session.user.role !== "AGENT" && !admin) notFound()

  // Valider l'identifiant de l'annonce avec Zod et retourner une erreur 404 s'il est invalide.

  const parsedId = idSchema.safeParse(annonceId)
  if (!parsedId.success) notFound()

  // Rechercher l'annonce par son identifiant validé et récupérer uniquement les champs nécessaires.

  const annonce = await prisma.annonce.findUnique({
    where: { id: parsedId.data },
    select: { id: true, auteurId: true, type: true },
  })
  // Retourner une erreur 404 si l'annonce n'existe pas dans la BDD
  // ou si l'utilisateur n'est pas ADMIN et  il est AGENT mais il n'est pas propriétaire de l'annonce.
  if (!annonce || (!admin && annonce.auteurId !== session.user.id)) notFound()

  // Retourner les informations de l'annonce et de l'utilisateur connecté
  return {
    id: annonce.id,
    auteurId: annonce.auteurId,
    type: annonce.type,
    actorId: session.user.id,
    admin,
  }
}

// Définir la condition WHERE : si ADMIN, vérifier uniquement l'ID de l'annonce.
// Si AGENT, vérifier l'ID de l'annonce et que son auteurId correspond à l'ID de l'agent connecté.
function ownedWhere(scope: AnnonceScope) {
  return scope.admin
    ? { id: scope.id }
    : { id: scope.id, auteurId: scope.actorId }
}

// Invalider le cache des pages concernées après une modification
// Après une modification, nous invalidons le cache des pages concernées
// pour qu'elles affichent les nouvelles données lors de leur prochain chargement.

function refresh(annonceId: string) {
  revalidatePath("/")
  revalidatePath("/annonces")
  revalidatePath(`/annonces/${annonceId}`)
  revalidatePath("/agent/dashboard")
  revalidatePath(`/agent/annonces/${annonceId}`)
  revalidatePath("/favoris")
  revalidatePath("/admin/annonces")
}


// fonction qui permet de modifier le statut d'une annonce (publier, brouillon)

export async function updateStatutPublication(annonceId: string, formData: FormData) {
  // Récupérer le scope de l'annonce autorisée (l'authentification et l'autorisation et validation zod
  // de l'id de l'annonce sont effectuées par authorizedAnnonce).
  const scope = await authorizedAnnonce(annonceId)

  // Récupérer et valider le statut depuis le formulaire.
  const statut = statutSchema.parse(formData.get("statut"))

  // Persister la modification dans la BDD avec la condition WHERE retournée par ownedWhere.
  await prisma.annonce.update({ where: ownedWhere(scope), data: { statut } })

  // Appeler refresh pour exécuter revalidatePath sur les pages concernées.
  refresh(annonceId)

  // Rediriger vers la page de l'annonce avec un paramètre
  // permettant d'afficher un toast de confirmation.

  redirect(`/agent/annonces/${annonceId}?toast=statut_ok`)
}

// Fonction permettant de mettre à jour l'état d'une annonce (vendu, loué ou disponible).
export async function updateEtatBien(annonceId: string, formData: FormData) {

  // Récupérer le scope de l'annonce autorisée.
  // L'authentification, l'autorisation et la validation Zod de l'ID
  // de l'annonce sont effectuées par authorizedAnnonce.
  const scope = await authorizedAnnonce(annonceId)

  // Récupérer et valider l'état demandé depuis le formulaire avec Zod.
  const etat = etatSchema.parse(formData.get("etat"))

  // Empêcher les états incompatibles avec le type de transaction :
  // une annonce en vente ne peut pas être louée,
  // et une annonce en location ne peut pas être vendue.
  if ((scope.type === "VENTE" && etat === "LOUE") ||
    (scope.type === "LOCATION" && etat === "VENDU")) {
    throw new Error("État incompatible avec le type de transaction.")
  }

  // Persister la modification dans la BDD avec la condition WHERE retournée par ownedWhere.
  await prisma.annonce.update({ where: ownedWhere(scope), data: { etat } })

  // Appeler refresh pour exécuter revalidatePath sur les pages concernées.
  refresh(annonceId)

  // Rediriger vers la page de l'annonce avec un paramètre
  // permettant d'afficher un toast de confirmation.
  redirect(`/agent/annonces/${annonceId}?toast=etat_ok`)
}

// ####### traitement des photos ########

async function cleanupUnusedPhotos(urls: string[]) {
  for (const url of new Set(urls)) {
    try {
      // Ne jamais supprimer une photo encore référencée.
      const references = await prisma.photo.count({
        where: { url },
      })

      if (references === 0) {
        await deleteAnnoncePhoto(url)
      }
    } catch (error) {
      // L'opération en base a déjà réussi.
      console.error("Nettoyage photo Supabase échoué :", error)
    }
  }
}

export async function deleteAnnonce(annonceId: string) {
  const scope = await authorizedAnnonce(annonceId)

  const photos = await prisma.photo.findMany({
    where: { annonceId: scope.id },
    select: { url: true },
  })

  // Suppression de l'annonce et des références associées.
  await prisma.annonce.delete({
    where: ownedWhere(scope),
  })

  // Supprimer les fichiers Supabase devenus inutilisés.
  await cleanupUnusedPhotos(photos.map((photo) => photo.url))

  refresh(annonceId)
  redirect("/agent/dashboard?toast=delete_ok")
}


// Détecter le format réel d'une image (JPG, PNG ou WebP) à partir
// de sa signature binaire, sans se fier uniquement à son extension.

function detectImageExtension(buffer: Buffer): "jpg" | "png" | "webp" | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg"
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png"
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "webp"
  return null
}

// Récupérer et valider les nouvelles photos du formulaire (nombre, taille et format).
async function validateNewPhotos(formData: FormData): Promise<File[]> {
  const entries = formData.getAll("newPhotos").filter((item) => !(typeof item === "string" && item.length === 0))
  if (entries.length > 10) throw new Error("10 nouvelles photos maximum.")

  const result: File[] = []
  let totalBytes = 0
  for (const item of entries) {
    if (!(item instanceof File)) throw new Error("Fichier photo invalide.")
    if (item.size === 0) continue
    if (item.size > 5 * 1024 * 1024) throw new Error("Photo de plus de 5 Mo.")
    totalBytes += item.size
    if (totalBytes > 30 * 1024 * 1024) throw new Error("Photos trop volumineuses.")

    const buffer = Buffer.from(await item.arrayBuffer())
    const extension = detectImageExtension(buffer)
    const mimeForExtension = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const
    if (!extension || item.type !== mimeForExtension[extension]) {
      throw new Error("Format de photo interdit : JPEG, PNG ou WebP uniquement.")
    }
    result.push(item)
  }
  return result
}

// ###########  updateAnnonce ##########


// Mettre à jour les informations et les photos d'une annonce autorisée,
// en garantissant l'atomicité des modifications en BDD et en prévoyant
// la restauration des fichiers en cas d'échec.
export async function updateAnnonce(annonceId: string, formData: FormData) {

  // Récupérer le scope de l'annonce autorisée.
  // L'authentification, l'autorisation et la validation Zod de l'ID
  // de l'annonce sont effectuées par authorizedAnnonce.
  const scope = await authorizedAnnonce(annonceId)

  // Récupérer et valider les informations de l'annonce
  // depuis le formulaire avec le schéma Zod annonceSchema.
  const data = annonceSchema.parse({
    titre: formData.get("titre"),
    description: formData.get("description"),
    ville: formData.get("ville"),
    prix: formData.get("prix"),
    surface: formData.get("surface"),
    chambres: formData.get("chambres"),
    type: formData.get("type"),
    typePropriete: formData.get("typePropriete"),
    dateDisponibilite: formData.get("dateDisponibilite"),
  })

  // Récupérer et valider les ID des photos à supprimer avec Zod
  // (30 identifiants maximum).
  const ids = z.array(idSchema).max(30).parse(formData.getAll("deletePhotos"))

  // Éliminer les identifiants en double.
  const uniqueIds = [...new Set(ids)]

  // Récupérer uniquement les photos appartenant à l'annonce concernée.
  const photos = uniqueIds.length
    ? await prisma.photo.findMany({
      where: { id: { in: uniqueIds }, annonceId: scope.id },
      select: { id: true, url: true },
    })
    : []

  // Refuser la suppression si une photo est introuvable
  // ou n'appartient pas à l'annonce.
  if (photos.length !== uniqueIds.length) {
    throw new Error("Photo non autorisée ou introuvable.")
  }

  // Récupérer et valider les nouvelles photos du formulaire (nombre, taille et format),
  // puis préparer leur contenu binaire et une URL unique pour leur stockage.
  const newPhotos = await validateNewPhotos(formData)

  const uploadedUrls: string[] = []

  try {
    // 1. Envoyer les nouvelles photos dans Supabase.
    for (const photo of newPhotos) {
      const url = await uploadAnnoncePhoto(photo)
      uploadedUrls.push(url)
    }

    // 2. Modifier l'annonce et ses photos atomiquement.
    await prisma.$transaction(async (tx) => {
      await tx.annonce.update({
        where: ownedWhere(scope),
        data: {
          ...data,
          ...(data.type !== scope.type
            ? { etat: "DISPONIBLE" as const }
            : {}),
        },
      })

      if (uniqueIds.length > 0) {
        await tx.photo.deleteMany({
          where: {
            annonceId: scope.id,
            id: { in: uniqueIds },
          },
        })
      }

      if (uploadedUrls.length > 0) {
        await tx.photo.createMany({
          data: uploadedUrls.map((url) => ({
            annonceId: scope.id,
            url,
          })),
        })
      }
    })
  } catch (error) {
    console.error("Erreur de modification d'annonce :", error)

    // La transaction a échoué : nettoyer les nouveaux uploads.
    const cleanup = await Promise.allSettled(
      uploadedUrls.map((url) => deleteAnnoncePhoto(url)),
    )

    cleanup.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Échec du nettoyage Supabase :", result.reason)
      }
    })

    throw error
  }

  // 3. Nettoyage après confirmation en base.
  await cleanupUnusedPhotos(photos.map((photo) => photo.url))

  refresh(annonceId)

  redirect(`/agent/annonces/${annonceId}?toast=updated`)
}
