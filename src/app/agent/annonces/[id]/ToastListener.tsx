'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-toastify'

export function ToastListener() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const lastToast = useRef<string | null>(null)

  useEffect(() => {
    const toastType = searchParams.get('toast')

    if (!toastType) {
      lastToast.current = null
      return
    }

    if (lastToast.current === toastType) return
    lastToast.current = toastType

    if (toastType === 'statut_ok') {
      toast.success('Statut de publication mis à jour')
    } else if (toastType === 'delete_ok') {
      toast.success('Annonce supprimée avec succès')
    } else if (toastType === 'etat_ok') {
      toast.success('État du bien mis à jour')
    } else if (toastType === 'updated') {
      toast.success('État du bien mis à jour')
    }

    router.replace(pathname, { scroll: false })
  }, [searchParams, router, pathname])

  return null
}