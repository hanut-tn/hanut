'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  customerId: string
  anonymizeCustomer: (id: string) => Promise<{ error?: string }>
}

export default function AnonymizeCustomerButton({ customerId, anonymizeCustomer }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await anonymizeCustomer(customerId)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => {
          setOpen(false)
          router.refresh()
        }, 1500)
      }
    })
  }

  return (
    <>
      <div className="space-y-5 max-w-4xl mt-5">
        <div className="card p-5 ring-1 ring-orange-200">
          <h2 className="font-semibold text-orange-700 mb-1">Anonymiser ce client</h2>
          <p className="text-xs text-[#78716C] mb-4">
            Conformément à la loi organique n° 2004-63, vous pouvez effacer les données personnelles
            (nom, téléphone, adresse) tout en conservant l&apos;historique des commandes.
            Cette action est irréversible.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-secondary min-h-[44px] touch-manipulation text-sm text-orange-700 border-orange-200 hover:bg-orange-50"
          >
            Anonymiser les données personnelles
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-6">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 space-y-5">
            {success ? (
              <div className="text-center py-4 space-y-2">
                <p className="font-semibold text-gray-900">Client anonymisé</p>
                <p className="text-sm text-gray-500">Les données personnelles ont été effacées.</p>
              </div>
            ) : (
              <>
                <h2 className="font-semibold text-gray-900 text-lg">Anonymiser ce client ?</h2>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700 space-y-1">
                  <p className="font-medium mb-1">Cette action supprimera :</p>
                  <p>• Nom → &quot;Client anonymisé&quot;</p>
                  <p>• Téléphone, adresse, ville, notes, tags</p>
                  <p className="mt-2 text-xs">L&apos;historique des commandes est conservé.</p>
                </div>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(null) }}
                    className="btn-secondary min-h-[44px] touch-manipulation flex-1"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="flex-1 min-h-[44px] touch-manipulation bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {isPending ? 'Anonymisation...' : 'Confirmer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
