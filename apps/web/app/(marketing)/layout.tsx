import type { Metadata } from 'next'
import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'

export const metadata: Metadata = {
  openGraph: {
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
    images: [{ url: 'https://hanut.tn/icon-512.png', width: 512, height: 512, alt: 'Hanut' }],
  },
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
