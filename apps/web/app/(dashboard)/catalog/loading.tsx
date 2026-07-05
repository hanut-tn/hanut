// Skeleton du catalogue : reproduit la structure header + toolbar + grille
// pour éviter le saut de mise en page pendant le chargement serveur.
export default function CatalogLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-[#E7E5E4]" />
          <div className="h-4 w-24 rounded bg-[#F5F5F4]" />
        </div>
        <div className="h-11 w-full rounded-lg bg-[#E7E5E4] sm:w-44" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="h-11 w-full rounded-lg bg-[#F5F5F4] sm:w-64" />
        <div className="h-11 w-full rounded-lg bg-[#F5F5F4] sm:w-32" />
        <div className="h-11 w-full rounded-lg bg-[#F5F5F4] sm:w-40" />
      </div>

      {/* Grille de 6 skeleton cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-[#E7E5E4] rounded-xl overflow-hidden">
            <div className="aspect-square bg-[#F5F5F4]" />
            <div className="p-3 sm:p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-[#E7E5E4]" />
              <div className="h-5 w-16 rounded bg-[#E7E5E4]" />
              <div className="h-1.5 w-full rounded-full bg-[#F5F5F4]" />
              <div className="flex gap-2">
                <div className="h-9 flex-1 rounded-lg bg-[#F5F5F4]" />
                <div className="h-9 w-9 rounded-lg bg-[#F5F5F4]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
