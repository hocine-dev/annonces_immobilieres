"use client"

import Image from "next/image"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  Images,
  UploadCloud,
  X,
} from "lucide-react"

import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTOS,
  MAX_PHOTO_SIZE,
} from "@/lib/validators/photo"

type PhotoDropzoneProps = {
  error?: string
}

export function PhotoDropzone({
  error,
}: PhotoDropzoneProps) {
  const inputRef =
    useRef<HTMLInputElement>(null)

  const [files, setFiles] =
    useState<File[]>([])

  const [localError, setLocalError] =
    useState("")

  const [isDragging, setIsDragging] =
    useState(false)

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [files],
  )

  useEffect(() => {
    return () => {
      previews.forEach(({ url }) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [previews])

  function syncInput(nextFiles: File[]) {
    if (!inputRef.current) {
      return
    }

    const transfer = new DataTransfer()

    nextFiles.forEach((file) => {
      transfer.items.add(file)
    })

    inputRef.current.files =
      transfer.files
  }

  function updateFiles(nextFiles: File[]) {
    setFiles(nextFiles)
    syncInput(nextFiles)
  }

  function addFiles(
    incomingFiles: File[],
  ) {
    setLocalError("")

    const invalidType =
      incomingFiles.find(
        (file) =>
          !ACCEPTED_PHOTO_TYPES.includes(
            file.type as (typeof ACCEPTED_PHOTO_TYPES)[number],
          ),
      )

    if (invalidType) {
      setLocalError(
        "Seuls les fichiers JPG, PNG et WebP sont acceptés.",
      )
      return
    }

    const tooLarge =
      incomingFiles.find(
        (file) =>
          file.size > MAX_PHOTO_SIZE,
      )

    if (tooLarge) {
      setLocalError(
        `${tooLarge.name} dépasse la limite de 5 Mo.`,
      )
      return
    }

    const merged = [
      ...files,
      ...incomingFiles,
    ].filter(
      (file, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified ===
              file.lastModified,
        ) === index,
    )

    if (merged.length > MAX_PHOTOS) {
      setLocalError(
        `Vous pouvez ajouter au maximum ${MAX_PHOTOS} photos.`,
      )
      return
    }

    updateFiles(merged)
  }

  function removeFile(index: number) {
    updateFiles(
      files.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    )

    setLocalError("")
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          inputRef.current?.click()
        }
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)

          addFiles(
            Array.from(
              event.dataTransfer.files,
            ),
          )
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/40 hover:bg-primary/[0.02]"
        }`}
      >
        <input
          ref={inputRef}
          id="photos"
          name="photos"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            addFiles(
              Array.from(
                event.target.files ?? [],
              ),
            )
          }}
        />

        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {isDragging ? (
            <Images className="size-7" />
          ) : (
            <UploadCloud className="size-7" />
          )}
        </div>

        <p className="mt-4 font-semibold text-foreground">
          {isDragging
            ? "Déposez les photos ici"
            : "Glissez-déposez vos photos"}
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          ou cliquez pour parcourir vos fichiers
        </p>

        <p className="mt-3 text-xs text-muted-foreground">
          JPG, PNG ou WebP · 5 Mo max ·{" "}
          {MAX_PHOTOS} photos maximum
        </p>
      </div>

      {(localError || error) && (
        <p
          role="alert"
          className="mt-2 text-sm font-medium text-destructive"
        >
          {localError || error}
        </p>
      )}

      {previews.length > 0 && (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">
              Photos sélectionnées
            </p>

            <span className="text-xs text-muted-foreground">
              {files.length}/{MAX_PHOTOS}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.map(
              ({ file, url }, index) => (
                <div
                  key={`${file.name}-${file.lastModified}`}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <Image
                    src={url}
                    alt={`Aperçu ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />

                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Principale
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      removeFile(index)
                    }}
                    aria-label={`Supprimer ${file.name}`}
                    className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}