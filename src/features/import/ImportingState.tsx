import TopBar from '@/components/TopBar'

/** "Reading HTML file" loading screen (Figma: File import). */
export default function ImportingState({ fileName }: { fileName?: string }) {
  return (
    <div className="relative min-h-screen bg-dotgrid">
      <TopBar disabled />
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center">
          <div className="grid w-[260px] grid-cols-2 gap-3">
            <div className="h-16 animate-pulse rounded-lg border border-dashed border-neutral-300 bg-white/70" />
            <div className="h-16 animate-pulse rounded-lg border border-dashed border-neutral-300 bg-white/70" />
            <div className="h-16 animate-pulse rounded-lg border border-dashed border-neutral-300 bg-white/70" />
            <div className="h-16 animate-pulse rounded-lg border border-dashed border-neutral-300 bg-white/70" />
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm text-neutral-500">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
            Reading HTML file{fileName ? ` — ${fileName}` : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
