import type { Metadata } from 'next'
import MarketingNavbar from '@/components/marketing/Navbar'
import MarketingFooter from '@/components/marketing/Footer'
import PricingSection from '@/components/marketing/PricingSection'
import HeroSection from '@/components/marketing/HeroSection'
import BeforeAfterSection from '@/components/marketing/BeforeAfterSection'
import LiveDemoSection from '@/components/marketing/LiveDemoSection'
import StorytellingSarra from '@/components/marketing/StorytellingSarra'
import StickyPhoneShowcase from '@/components/marketing/StickyPhoneShowcase'
import SocialProofNumbers from '@/components/marketing/SocialProofNumbers'
import TrustSection from '@/components/marketing/TrustSection'
import FaqSection from '@/components/marketing/FaqSection'
import FinalCtaSection from '@/components/marketing/FinalCtaSection'

export const metadata: Metadata = {
  title: 'Hanut — Vendez sur WhatsApp et Instagram avec votre mini boutique',
  description: 'Créez votre boutique en ligne en 5 minutes. Partagez un lien, vos clients commandent directement. Gestion des commandes, stock et livraisons COD en Tunisie.',
  keywords: 'vente whatsapp tunisie, boutique instagram tunisie, gestion commandes COD, mini boutique en ligne, hanut',
  openGraph: {
    title: 'Hanut — Vendez sur WhatsApp et Instagram avec votre mini boutique',
    description: 'Partagez un lien, vos clients commandent directement. Commandes, stock et livraisons COD dans un seul tableau de bord.',
    url: 'https://www.hanut.tn',
    siteName: 'Hanut',
    locale: 'fr_TN',
    type: 'website',
    images: [{ url: 'https://www.hanut.tn/og-image.png', width: 1200, height: 628, alt: 'Hanut — Votre mini boutique WhatsApp et Instagram' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hanut — Vendez sur WhatsApp et Instagram avec votre mini boutique',
    description: 'Partagez un lien, vos clients commandent directement. Commandes, stock et livraisons COD dans un seul tableau de bord.',
    images: ['https://www.hanut.tn/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1C1917]">
      <MarketingNavbar />
      <main>
        <HeroSection />
        <BeforeAfterSection />
        <LiveDemoSection />
        <StorytellingSarra />
        <StickyPhoneShowcase />
        <SocialProofNumbers />
        <TrustSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MarketingFooter />
    </div>
  )
}
