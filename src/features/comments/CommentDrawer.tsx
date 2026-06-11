import { CloseIcon, CommentIcon } from '@/components/icons'
import type { Comment } from '@/store/useCommentStore'
import SingleComment from './SingleComment'

type Props = {
  comments: Comment[]
  activeId: string | null
  onSelect: (id: string | null) => void
  /** Owner-only controls; omitted (public viewer) hides them. */
  onClose?: () => void
  onResolve?: (id: string) => void
  onDelete?: (id: string) => void
}

/** Floating right-hand comments panel (Figma: drawer-comments). */
export default function CommentDrawer({
  comments,
  activeId,
  onSelect,
  onClose,
  onResolve,
  onDelete,
}: Props) {
  const open = comments.filter((c) => !c.resolved).length

  return (
    <aside className="flex h-full w-[336px] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0px_8px_32px_0px_rgba(0,0,0,0.12)]">
      <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <p className="flex-1 text-base font-medium leading-[22px] text-ink">Comments</p>
        {comments.length > 0 && (
          <span className="text-xs text-muted">
            {open} open{comments.length - open > 0 && ` · ${comments.length - open} resolved`}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="grid size-6 place-items-center rounded text-ink transition hover:bg-black/5"
          >
            <CloseIcon />
          </button>
        )}
      </header>

      {comments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-black/[0.03] text-muted">
            <CommentIcon size={18} />
          </div>
          <p className="mt-3 text-sm font-medium text-ink">No comments yet</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Click any element in the preview to leave feedback anchored to it.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {comments.map((c, i) => (
            <SingleComment
              key={c.id}
              comment={c}
              index={i + 1}
              active={c.id === activeId}
              onSelect={() => onSelect(c.id === activeId ? null : c.id)}
              onResolve={onResolve ? () => onResolve(c.id) : undefined}
              onDelete={onDelete ? () => onDelete(c.id) : undefined}
            />
          ))}
        </div>
      )}
    </aside>
  )
}
