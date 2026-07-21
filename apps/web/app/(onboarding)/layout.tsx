import Image from 'next/image'

// Layout minimal — pas de sidebar, pas de navbar dashboard. Juste le logo
// Hanut en haut et le contenu centré, pour que /setup reste un flow isolé
// tant que l'onboarding n'est pas terminé.
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-14 bg-white border-b border-gray-100 flex items-center justify-center shrink-0">
        <Image src="/logo-horizontal.svg" alt="Hanut" width={84} height={27} unoptimized />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {children}
        </div>
      </div>
    </div>
  )
}
