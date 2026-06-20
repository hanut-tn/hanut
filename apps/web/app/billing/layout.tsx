import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-stone-100 flex flex-col items-center justify-center px-4 py-12">
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
      </div>
      <div className="w-full max-w-3xl">
        {children}
      </div>
    </div>
  )
}
