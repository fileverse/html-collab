import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Logo, CommentIcon, ShareIcon, DownloadIcon, GitHubIcon, ExternalLinkIcon } from './icons'

const REPO_URL = 'https://github.com/fileverse/ai-feedback-loop'

const FLOAT_SHADOW = 'shadow-[0px_4px_8px_0px_rgba(0,0,0,0.15)]'

type TopBarProps = {
  /** Number shown on the Comments toggle badge. */
  commentCount?: number
  /** Whether the comments drawer is currently open (highlights the toggle). */
  commentsOpen?: boolean
  onToggleComments?: () => void
  /** Open the share popover; disabled until a doc exists. */
  onShare?: () => void
  shareOpen?: boolean
  shareDisabled?: boolean
  /** Export with baked-in feedback; disabled until a doc exists. */
  onDownload?: () => void
  downloadDisabled?: boolean
  /** Click the logo (e.g. start a new project / go home). */
  onLogoClick?: () => void
  /** Show the "Open source" GitHub pill at the start of the actions (Figma landing). */
  showOpenSource?: boolean
}

export default function TopBar({
  commentCount = 0,
  commentsOpen = false,
  onToggleComments,
  onShare,
  shareOpen = false,
  shareDisabled = false,
  onDownload,
  downloadDisabled = false,
  onLogoClick,
  showOpenSource = false,
}: TopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-6">
      <div className="pointer-events-auto">
        {onLogoClick ? (
          <button type="button" onClick={onLogoClick} title="Start a new file" className="block">
            <Logo />
          </button>
        ) : (
          <Logo />
        )}
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {showOpenSource && (
          <>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              title="Open source on GitHub"
              className={cn(
                'flex h-9 items-center gap-2 rounded-full bg-white px-3 text-sm font-medium text-ink transition hover:bg-neutral-50',
                FLOAT_SHADOW,
              )}
            >
              <GitHubIcon size={16} />
              Open source
              <span className="text-muted">
                <ExternalLinkIcon size={13} />
              </span>
            </a>
            <span className="mx-1 h-5 w-px bg-line" />
          </>
        )}

        <FloatBtn
          title="Comments"
          active={commentsOpen}
          badge={commentCount > 0 ? commentCount : undefined}
          onClick={onToggleComments}
        >
          <CommentIcon />
        </FloatBtn>

        <FloatBtn title="Share" active={shareOpen} disabled={shareDisabled} onClick={onShare}>
          <ShareIcon />
        </FloatBtn>

        <Pill
          title="Download your HTML with all comments embedded directly in the same file. Ready to be shared with your AI chatbot."
          onClick={onDownload}
          disabled={downloadDisabled}
        >
          <DownloadIcon />
          Download
        </Pill>
      </div>
    </header>
  )
}

/** 36px round white floating button (Figma: floating-button). */
function FloatBtn({
  children,
  title,
  active,
  badge,
  disabled,
  onClick,
}: {
  children: ReactNode
  title: string
  active?: boolean
  badge?: number
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative grid size-9 place-items-center rounded-full transition',
        FLOAT_SHADOW,
        disabled
          ? 'cursor-not-allowed bg-white text-disabled'
          : active
            ? 'bg-ink text-white'
            : 'bg-white text-ink hover:bg-neutral-50',
      )}
    >
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ring-2 ring-white',
            active ? 'bg-brand text-ink' : 'bg-ink text-white',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

/** Pill button with leading icon + label (Figma: Share / Download). */
function Pill({
  children,
  title,
  active,
  disabled,
  onClick,
}: {
  children: ReactNode
  title: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-9 min-w-20 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition',
        FLOAT_SHADOW,
        disabled
          ? 'cursor-not-allowed bg-white text-disabled'
          : active
            ? 'bg-ink text-white'
            : 'bg-white text-ink hover:bg-neutral-50',
      )}
    >
      {children}
    </button>
  )
}
