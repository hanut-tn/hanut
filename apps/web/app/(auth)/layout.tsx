import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-stone-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo-icone.svg"
            alt="Hanut"
            width={56}
            height={68}
            className="mx-auto mb-4"
            priority
            unoptimized
          />
          <h1 className="text-3xl font-bold text-gray-900">Hanut</h1>
          <p className="text-gray-500 text-sm mt-1">Gestion commandes WhatsApp</p>
        </div>
        {children}
      </div>
    </div>
  )
}
