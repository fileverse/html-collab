import { cn } from '@/lib/cn'
import { CommentIcon, CursorIcon } from './icons'

export type CanvasMode = 'browse' | 'comment'

/**
 * Floating segmented control over the preview: switch between *browsing* the
 * page (clicks pass through, so interactive HTML is navigable) and *commenting*
 * (clicks drop a pin). Sits top-center of the canvas, the one spot common to the
 * editor and the review view.
 */
export default function ModeToggle({
  mode,
  onChange,
}: {
  readonly mode: CanvasMode
  readonly onChange: (m: CanvasMode) => void
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center">
      <div
        role="radiogroup"
        aria-label="Canvas mode"
        className="pointer-events-auto inline-flex items-center gap-0.5 rounded-full border border-line bg-white/95 p-1 shadow-[0px_6px_20px_0px_rgba(0,0,0,0.14)] backdrop-blur"
      >
        <Segment
          active={mode === 'browse'}
          onClick={() => onChange('browse')}
          icon={<CursorIcon size={14} />}
          label="Browse"
          hint="Click through the page"
        />
        <Segment
          active={mode === 'comment'}
          onClick={() => onChange('comment')}
          icon={<CommentIcon size={14} />}
          label="Comment"
          hint="Click any element to leave feedback"
        />
      </div>
    </div>
  )
}

function Segment({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  readonly active: boolean
  readonly onClick: () => void
  readonly icon: React.ReactNode
  readonly label: string
  readonly hint: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      title={hint}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition',
        active ? 'bg-ink text-white shadow-sm' : 'text-muted hover:bg-black/[0.04] hover:text-ink',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
