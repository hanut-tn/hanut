import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col items-center justify-center px-4 text-center">
      <Image
        src="/logo-icone.svg"
        alt="Hanut"
        width={48}
        height={58}
        className="mb-6"
        priority
        unoptimized
      />
      <p className="text-6xl font-black text-[#1C1917] mb-3">404</p>
      <h1 className="text-xl font-bold text-[#1C1917] mb-2">Page introuvable</h1>
      <p className="text-sm text-gray-500 max-w-xs mb-8">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="inline-flex items-center bg-[#16A34A] hover:bg-green-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  )
}
