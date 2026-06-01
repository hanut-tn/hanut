import Navbar from '@/components/marketing/Navbar'
import Footer from '@/components/marketing/Footer'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1917]">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
