import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Logo, UploadIcon, CommentIcon, ShareIcon, DownloadIcon } from './icons'

type TopBarProps = {
  /** Landing page shows the chrome but the actions are inert. */
  disabled?: boolean
  /** Number shown on the Comments toggle badge. */
  commentCount?: number
  /** Whether the comments drawer is currently open (highlights the toggle). */
  commentsOpen?: boolean
  /** Toggle the comments drawer (Editor only). */
  onToggleComments?: () => void
  /** Export the document with baked-in feedback (Editor only). */
  onDownload?: () => void
  /** Open the share popover (Editor only). */
  onShare?: () => void
  /** Whether the share popover is open (highlights the button). */
  shareOpen?: boolean
  /** Import a different file (Editor only). */
  onUpload?: () => void
}

export default function TopBar({
  disabled = false,
  commentCount = 0,
  commentsOpen = false,
  onToggleComments,
  onDownload,
  onShare,
  shareOpen = false,
  onUpload,
}: TopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
      <div className="pointer-events-auto">
        <Logo />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <IconButton title="Import another file" disabled={disabled} onClick={onUpload}>
          <UploadIcon />
        </IconButton>
        <IconButton
          title="Comments"
          disabled={disabled}
          active={commentsOpen}
          badge={commentCount > 0 ? commentCount : undefined}
          onClick={onToggleComments}
        >
          <CommentIcon />
        </IconButton>

        <button
          type="button"
          disabled={disabled}
          onClick={onShare}
          className={cn(
            'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition',
            shareOpen
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50',
            disabled && 'cursor-not-allowed opacity-40 hover:bg-white',
          )}
        >
          <ShareIcon size={16} />
          Share
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onDownload}
          className={cn(
            'flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50',
            disabled && 'cursor-not-allowed opacity-40 hover:bg-white',
          )}
        >
          <DownloadIcon size={16} />
          Download
        </button>
      </div>
    </header>
  )
}

function IconButton({
  children,
  title,
  disabled,
  active,
  badge,
  onClick,
}: {
  children: ReactNode
  title: string
  disabled?: boolean
  active?: boolean
  badge?: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative grid h-9 w-9 place-items-center rounded-full border shadow-sm transition',
        active
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-white',
      )}
    >
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ring-2 ring-white',
            active ? 'bg-brand text-neutral-900' : 'bg-neutral-900 text-white',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}
