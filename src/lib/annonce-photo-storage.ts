import path from "node:path"

// Seuls les fichiers générés avec UUID sont supprimables physiquement.
// Les images du seed restent disponibles pour un futur réensemencement.
const uploadedPhoto = /^\/annonces\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp))$/i

export function disposableAnnonceUploadPath(url: string): string | null {
  const match = uploadedPhoto.exec(url)
  return match ? path.join(process.cwd(), "public", "annonces", "uploads", match[1]) : null
}
