'use client'

import React from 'react'
import { Trash2 } from 'lucide-react'

type DeleteButtonProps = {
  action: () => void
}

export function DeleteButton({ action }: DeleteButtonProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer cette annonce ? Cette action est irréversible.'
    )
    if (confirmed) {
      action()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive text-destructive-foreground hover:opacity-90 font-medium rounded-[var(--radius)] transition-opacity cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
        Supprimer l'annonce
      </button>
    </form>
  )
}