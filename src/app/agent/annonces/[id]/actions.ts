
'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { unlink,writeFile } from 'fs/promises'
import path from 'path'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function updateStatutPublication(
  annonceId: string,
  formData: FormData
) {
  // 1. Authentification
    const session = await auth.api.getSession({
      headers: await headers(),
    })
  
    if (!session) {
      return {
        success: false,
        message: "Vous devez être connecté.",
      }
    }
  
    // 2. Autorisation
    if (
      session.user.role !== "USER" &&
      session.user.role !== "ADMIN"
    ) {
      return {
        success: false,
        message:
          "Cette fonctionnalité est réservée aux utilisateurs.",
      }
    }

  const nouveauStatut = formData.get('statut') as 'BROUILLON' | 'PUBLIE'

  await prisma.annonce.update({
    where: { id: annonceId },
    data: { statut: nouveauStatut },
  })

  redirect(`/agent/annonces/${annonceId}?toast=statut_ok`)
}

export async function updateEtatBien(
  annonceId: string,
  formData: FormData
) {
  const nouvelEtat = formData.get('etat') as 'DISPONIBLE' | 'LOUE' | 'VENDU'

  await prisma.annonce.update({
    where: { id: annonceId },
    data: { etat: nouvelEtat },
  })

  redirect(`/agent/annonces/${annonceId}?toast=etat_ok`)
}
export async function deleteAnnonce(annonceId: string) {
  // 1. Authentification
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return {
      success: false,
      message: "Vous devez être connecté.",
    }
  }

  // 2. Autorisation
  if (
    session.user.role !== "USER" &&
    session.user.role !== "ADMIN"
  ) {
    return {
      success: false,
      message:
        "Cette fonctionnalité est réservée aux utilisateurs.",
    }
  }

  // 1. Récupérer les photos associées à l'annonce
  const photos = await prisma.photo.findMany({
    where: { annonceId },
    select: { url: true },
  })

  // 2. Supprimer chaque fichier du système de fichiers (/public/images)
  for (const photo of photos) {
    try {
      // Extrait juste le nom du fichier si 'photo.url' contient déjà '/images/nom.png'
      const fileName = path.basename(photo.url)

      // Reconstruit le chemin absolu vers /public/images/nom.png
      const filePath = path.join(process.cwd(), 'public', 'images', fileName)

      await unlink(filePath)
    } catch (error) {
      // Évite de bloquer la suppression BDD si le fichier physique est déjà inexistant
      console.error(`Impossible de supprimer la photo : ${photo.url}`, error)
    }
  }

  // 3. Supprimer l'annonce en base de données
  await prisma.annonce.delete({
    where: { id: annonceId },
  })

  // 4. Redirection vers le dashboard
  redirect('/agent/dashboard?toast=delete_ok')
}

export async function updateAnnonce(annonceId: string, formData: FormData) {
  // 1. Authentification
    const session = await auth.api.getSession({
      headers: await headers(),
    })
  
    if (!session) {
      return {
        success: false,
        message: "Vous devez être connecté.",
      }
    }
  
    // 2. Autorisation
    if (
      session.user.role !== "USER" &&
      session.user.role !== "ADMIN"
    ) {
      return {
        success: false,
        message:
          "Cette fonctionnalité est réservée aux utilisateurs.",
      }
    }
    
  const titre = formData.get('titre') as string
  const description = formData.get('description') as string
  const ville = formData.get('ville') as string
  const prix = parseFloat(formData.get('prix') as string)
  const surface = parseInt(formData.get('surface') as string, 10)
  const chambres = parseInt(formData.get('chambres') as string, 10)
  const type = formData.get('type') as any
  const typePropriete = formData.get('typePropriete') as any
  const dateDisponibilite = new Date(formData.get('dateDisponibilite') as string)

  // 1. Mise à jour des informations textuelles de l'annonce
  await prisma.annonce.update({
    where: { id: annonceId },
    data: {
      titre,
      description,
      ville,
      prix,
      surface,
      chambres,
      type,
      typePropriete,
      dateDisponibilite,
    },
  })

  // 2. Traitement des photos à supprimer du disque et de la BDD
  const photosToDeleteIds = formData.getAll('deletePhotos') as string[]

  if (photosToDeleteIds.length > 0) {
    const photosToDelete = await prisma.photo.findMany({
      where: { id: { in: photosToDeleteIds } },
      select: { id: true, url: true },
    })

    // Suppression physique des fichiers du dossier /public/images
    for (const photo of photosToDelete) {
      try {
        const fileName = path.basename(photo.url)
        const filePath = path.join(process.cwd(), 'public', 'images', fileName)
        await unlink(filePath)
      } catch (error) {
        console.error(`Erreur lors de la suppression du fichier : ${photo.url}`, error)
      }
    }

    // Suppression des entrées en BDD
    await prisma.photo.deleteMany({
      where: { id: { in: photosToDeleteIds } },
    })
  }

  // 3. Traitement des nouvelles photos téléversées
  const newPhotos = formData.getAll('newPhotos') as File[]

  for (const file of newPhotos) {
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Génération d'un nom unique pour éviter les collisions
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
      const ext = path.extname(file.name) || '.jpg'
      const fileName = `annonce-${uniqueSuffix}${ext}`
      const filePath = path.join(process.cwd(), 'public', 'images', fileName)

      // Écriture du fichier sur le disque
      await writeFile(filePath, buffer)

      // Création de l'entrée en base de données
      await prisma.photo.create({
        data: {
          url: `/images/${fileName}`,
          annonceId: annonceId,
        },
      })
    }
  }

  redirect(`/agent/annonces/${annonceId}?toast=updated`)
}
