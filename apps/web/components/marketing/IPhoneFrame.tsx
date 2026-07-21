// Chrome iPhone partagé par les mockups de la landing (Hero, LiveDemo,
// Showcase) — évite de dupliquer le même dégradé/encoche/indicateur trois
// fois. Le contenu de l'écran est fourni par le parent via `children`.
export default function IPhoneFrame({
  children,
  compact = false,
  className = '',
}: {
  children: React.ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={`relative mx-auto aspect-[390/844] ${compact ? 'w-[13.5rem] sm:w-[15rem]' : 'w-[17rem] xl:w-[18rem]'} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute -inset-5 rounded-[3.5rem] bg-white/70 shadow-[0_34px_80px_rgba(15,23,42,0.14)]" />
      <div className="absolute -left-[5px] top-[18%] h-[8%] w-[5px] rounded-l-md bg-[#4B5563]" />
      <div className="absolute -left-[5px] top-[29%] h-[12%] w-[5px] rounded-l-md bg-[#4B5563]" />
      <div className="absolute -right-[5px] top-[28%] h-[12%] w-[5px] rounded-r-md bg-[#4B5563]" />

      <div className="relative h-full rounded-[3.15rem] bg-[linear-gradient(135deg,#6B7280_0%,#111827_32%,#020617_68%,#9CA3AF_100%)] p-[2px] shadow-[0_30px_70px_rgba(15,23,42,0.28)]">
        <div className="h-full rounded-[3rem] bg-[linear-gradient(180deg,#1F2937_0%,#030712_100%)] p-[5px]">
          <div className="h-full rounded-[2.68rem] bg-black p-[2px]">
            <div className="relative h-full overflow-hidden rounded-[2.48rem] bg-white ring-1 ring-black/5">
              <div className="absolute left-1/2 top-3 z-30 flex h-6 w-[5.7rem] -translate-x-1/2 items-center justify-center rounded-full bg-black shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0)_100%)]" />
              {children}
              <div className="absolute bottom-3 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
