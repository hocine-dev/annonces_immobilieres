import { z } from "zod"

export const MAX_PHOTOS = 6
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024

export const ACCEPTED_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export const photosSchema = z
  .array(
    z.object({
      name: z.string().min(1),

      type: z.string().refine(
        (type) =>
          ACCEPTED_PHOTO_TYPES.includes(
            type as (typeof ACCEPTED_PHOTO_TYPES)[number],
          ),
        "Format non autorisé. Utilisez JPG, PNG ou WebP.",
      ),

      size: z
        .number()
        .positive()
        .max(
          MAX_PHOTO_SIZE,
          "Chaque photo doit faire moins de 5 Mo.",
        ),
    }),
  )
  .max(
    MAX_PHOTOS,
    `Vous pouvez ajouter au maximum ${MAX_PHOTOS} photos.`,
  )