import TopBar from '@/components/TopBar'

/** "Reading HTML file" loading screen (Figma: File import). */
export default function ImportingState({
  fileName,
  label = 'Reading HTML file',
}: {
  fileName?: string
  label?: string
}) {
  return (
    <div className="relative min-h-screen bg-dotgrid">
      <TopBar shareDisabled downloadDisabled showOpenSource />
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-4">
          {/* staggered skeleton (Figma) */}
          <div className="flex animate-pulse flex-col gap-3">
            <div className="flex gap-3">
              <div className="size-[72px] rounded-lg border border-dashed border-line" />
              <div className="h-[72px] w-[160px] rounded-lg border border-dashed border-line" />
            </div>
            <div className="flex gap-3">
              <div className="h-[72px] w-[160px] rounded-lg border border-dashed border-line" />
              <div className="size-[72px] rounded-lg border border-dashed border-line" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="size-3.5 animate-spin rounded-full border-2 border-line border-t-muted" />
            {label}
            {fileName ? ` — ${fileName}` : ''}
          </div>
        </div>
      </div>
      <p className="absolute bottom-6 left-6 text-xs leading-4 text-muted">Open source</p>
    </div>
  )
}
