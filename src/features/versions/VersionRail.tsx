import { useState } from 'react'
import { cn } from '@/lib/cn'

export type VersionPill = {
  no: number
  /** ms timestamp; shown on hover. */
  createdAt?: number
  /** comments on this version; shown on hover. */
  commentCount?: number
}

type Props = {
  versions: VersionPill[]
  active: number
  onSelect: (no: number) => void
}

function formatDate(ts?: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/**
 * Vertical version switcher pinned to the left page margin (Figma): newest on
 * top, active is solid black. Hovering a version expands its pill to show the
 * date + comment count. Hidden when there's only a single version.
 */
export default function VersionRail({ versions, active, onSelect }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  if (versions.length < 2) return null
  const top = [...versions].sort((a, b) => b.no - a.no) // newest first (top)

  return (
    <div className="absolute left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-start">
      {top.map((v, i) => {
        const expanded = hovered === v.no
        const isActive = v.no === active
        return (
          <div key={v.no} className="flex flex-col items-start">
            {i > 0 && <span className="ml-[13px] h-3 w-px bg-line" />}
            <button
              type="button"
              title={`Switch to v${v.no}`}
              onMouseEnter={() => setHovered(v.no)}
              onMouseLeave={() => setHovered((h) => (h === v.no ? null : h))}
              onClick={() => onSelect(v.no)}
              className={cn(
                'flex h-7 items-center rounded-full shadow-[0px_2px_6px_0px_rgba(0,0,0,0.15)] transition',
                isActive ? 'bg-ink text-white' : 'bg-white text-muted hover:text-ink',
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center text-xs font-medium">
                v{v.no}
              </span>
              {expanded && (
                <span className="whitespace-nowrap pr-3 text-xs leading-4">
                  <span className={isActive ? 'text-white/70' : 'text-muted'}>
                    {formatDate(v.createdAt)}
                  </span>
                  {v.commentCount !== undefined && (
                    <span className={cn('ml-2', isActive ? 'text-white' : 'text-ink')}>
                      {v.commentCount} comment{v.commentCount === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
