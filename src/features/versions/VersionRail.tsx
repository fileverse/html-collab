import { cn } from '@/lib/cn'

type Props = {
  /** Version numbers present, ascending (e.g. [1,2,3]). */
  versions: number[]
  active: number
  onSelect: (no: number) => void
}

/**
 * Vertical version switcher pinned to the left edge (Figma): newest on top,
 * active is solid black, older ones are grey, joined by a connecting line.
 * Hidden when there's only a single version.
 */
export default function VersionRail({ versions, active, onSelect }: Props) {
  if (versions.length < 2) return null
  const top = [...versions].sort((a, b) => b - a) // newest first (top)

  return (
    <div className="absolute left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center">
      {top.map((no, i) => (
        <div key={no} className="flex flex-col items-center">
          {i > 0 && <span className="h-3 w-px bg-line" />}
          <button
            type="button"
            title={`Switch to v${no}`}
            onClick={() => onSelect(no)}
            className={cn(
              'grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-medium shadow-[0px_2px_6px_0px_rgba(0,0,0,0.15)] transition',
              no === active
                ? 'bg-ink text-white'
                : 'bg-white text-muted hover:bg-neutral-50 hover:text-ink',
            )}
          >
            v{no}
          </button>
        </div>
      ))}
    </div>
  )
}
