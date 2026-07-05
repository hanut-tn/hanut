// Skeleton de la boutique publique : navbar + bannière + grille produits.
export default function StorefrontLoading() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-100 h-14 flex items-center">
        <div className="max-w-5xl mx-auto w-full px-4 flex items-center justify-between">
          <div className="h-6 w-20 rounded bg-gray-200" />
          <div className="flex gap-2">
            <div className="h-8 w-16 rounded-full bg-gray-100" />
            <div className="h-8 w-9 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>

      {/* Bannière */}
      <div className="h-32 bg-gray-200">
        <div className="max-w-5xl mx-auto h-full px-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-300" />
          <div className="space-y-2">
            <div className="h-6 w-44 rounded bg-gray-300" />
            <div className="h-3.5 w-60 rounded bg-gray-300/70" />
          </div>
        </div>
      </div>

      {/* Grille 6 cartes */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 gap-3 px-3 py-4 sm:grid-cols-3 sm:gap-4 sm:px-4 lg:grid-cols-4 lg:gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-gray-200" />
            <div className="px-3 pb-3 pt-2 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="h-10 w-full rounded-xl bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
