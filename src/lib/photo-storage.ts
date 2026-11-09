
import "server-only"

import { randomUUID } from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { MAX_PHOTO_SIZE } from "@/lib/validators/photo"

const BUCKET = "annonces-photos"

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

// Client réservé au serveur, sans session Supabase Auth.
function getStorage() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    throw new Error("Configuration Supabase Storage manquante")
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return supabase.storage.from(BUCKET)
}

// Enregistrer une nouvelle photo dans Supabase Storage.
export async function uploadAnnoncePhoto(file: File): Promise<string> {
  const extension = EXTENSIONS[file.type]

  if (!extension || file.size === 0 || file.size > MAX_PHOTO_SIZE) {
    throw new Error("Photo invalide : format ou taille non autorisé")
  }

  const filename = `${randomUUID()}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const storage = getStorage()

  const { error } = await storage.upload(filename, buffer, {
    contentType: file.type,
    upsert: false,
    cacheControl: "3600",
  })

  if (error) {
    throw new Error(`Erreur upload Supabase : ${error.message}`)
  }

  const { data } = storage.getPublicUrl(filename)
  return data.publicUrl
}

// Supprimer uniquement une photo créée dans notre bucket.
// Les anciennes photos locales et celles du seed sont préservées.
export async function deleteAnnoncePhoto(url: string): Promise<void> {
  const baseUrl = process.env.SUPABASE_URL
  if (!baseUrl) throw new Error("SUPABASE_URL manquante")

  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return // Ancienne URL locale
  }

  const prefix = `/storage/v1/object/public/${BUCKET}/`

  if (
    parsed.origin !== new URL(baseUrl).origin ||
    !parsed.pathname.startsWith(prefix)
  ) {
    return
  }

  const filename = parsed.pathname.slice(prefix.length)

  // Seuls les fichiers générés par notre application sont supprimables.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(filename)) {
    return
  }

  const { error } = await getStorage().remove([filename])

  if (error) {
    throw new Error(`Erreur suppression Supabase : ${error.message}`)
  }
}
