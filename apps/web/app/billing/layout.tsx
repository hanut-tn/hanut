export const dynamic = 'force-dynamic'

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-stone-100 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-2xl font-bold text-white">H</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Hanut</h1>
      </div>
      <div className="w-full max-w-3xl">
        {children}
      </div>
    </div>
  )
}
