import { cn } from '@/lib/cn'
import { ResolveIcon, MoreIcon, VerifiedBadge } from '@/components/icons'
import type { Comment } from '@/store/useCommentStore'
import Avatar from './Avatar'
import { formatTime } from './format'

type Props = {
  comment: Comment
  /** 1-based pin number, shown in the meta row + on the preview pin. */
  index: number
  active: boolean
  onSelect: () => void
  /** Owner-only actions; omitted (e.g. public viewer) hides the hover controls. */
  onResolve?: () => void
  onDelete?: () => void
}

/** A published comment card (Figma: singleComment-published). */
export default function SingleComment({
  comment,
  index,
  active,
  onSelect,
  onResolve,
  onDelete,
}: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group flex w-full cursor-pointer flex-col gap-2 rounded-xl bg-black/[0.02] p-3 text-left transition',
        active && 'bg-brand/10 ring-2 ring-brand',
        comment.resolved && 'opacity-55',
      )}
    >
      {/* meta: pin number · element label · linked quote */}
      <div className="flex items-center gap-2 pb-0.5 text-xs leading-4 text-muted">
        <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded bg-ink px-1 text-[10px] font-bold text-white">
          {index}
        </span>
        <span className="max-w-[120px] shrink-0 truncate font-mono">{comment.anchor.label}</span>
        {comment.anchor.quote && (
          <span className="min-w-0 flex-1 truncate">“{comment.anchor.quote}”</span>
        )}
      </div>

      {/* header: avatar · name · time · hover actions */}
      <div className="flex items-center gap-2">
        <Avatar name={comment.author} />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-sm font-medium leading-5 text-ink">{comment.author}</span>
            <VerifiedBadge />
          </div>
          <span className="min-w-0 flex-1 truncate text-xs leading-4 text-muted">
            {formatTime(comment.createdAt)}
          </span>
        </div>
        {(onResolve || onDelete) && (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            {onResolve && (
              <button
                type="button"
                title={comment.resolved ? 'Reopen' : 'Resolve'}
                onClick={(e) => {
                  e.stopPropagation()
                  onResolve()
                }}
                className={cn(
                  'grid size-6 place-items-center rounded text-ink transition hover:bg-black/5',
                  comment.resolved && 'text-emerald-600',
                )}
              >
                <ResolveIcon />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="grid size-6 place-items-center rounded text-ink transition hover:bg-black/5"
              >
                <MoreIcon />
              </button>
            )}
          </div>
        )}
      </div>

      {/* content: quote connector line + body */}
      <div className="flex w-full items-stretch gap-2">
        <div className="flex w-6 justify-center">
          <span className="w-px bg-line" />
        </div>
        <p
          className={cn(
            'min-w-0 flex-1 whitespace-pre-wrap text-sm leading-5 text-ink',
            comment.resolved && 'line-through',
          )}
        >
          {comment.body}
        </p>
      </div>
    </div>
  )
}
