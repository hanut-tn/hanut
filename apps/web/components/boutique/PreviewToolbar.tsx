'use client'

import { Smartphone, Monitor, ExternalLink } from 'lucide-react'

type Props = {
  viewMode: 'mobile' | 'desktop'
  onViewModeChange: (mode: 'mobile' | 'desktop') => void
  previewUrl: string | null
}

export default function PreviewToolbar({ viewMode, onViewModeChange, previewUrl }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#E7E5E4] bg-white shrink-0">
      <span className="text-sm font-medium text-[#78716C]">Aperçu</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center border border-[#E7E5E4] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => onViewModeChange('mobile')}
            aria-label="Aperçu mobile"
            className={`p-2 transition-colors ${viewMode === 'mobile' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'}`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('desktop')}
            aria-label="Aperçu desktop"
            className={`p-2 transition-colors ${viewMode === 'desktop' ? 'bg-[#0B5E46] text-white' : 'text-[#78716C] hover:bg-[#FAFAF9]'}`}
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ouvrir dans un nouvel onglet</span>
          </a>
        )}
      </div>
    </div>
  )
}
