import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  Logo,
  UploadIcon,
  CommentIcon,
  ShareIcon,
  DownloadIcon,
  LoginIcon,
  GitHubIcon,
  ExternalLinkIcon,
} from './icons'

const REPO_URL = 'https://github.com/fileverse/ai-feedback-loop'

const FLOAT_SHADOW = 'shadow-[0px_4px_8px_0px_rgba(0,0,0,0.15)]'

type TopBarProps = {
  /** Number shown on the Comments toggle badge. */
  commentCount?: number
  /** Whether the comments drawer is currently open (highlights the toggle). */
  commentsOpen?: boolean
  onToggleComments?: () => void
  /** Import / open a file. */
  onUpload?: () => void
  /** Open the share popover; disabled until a doc exists. */
  onShare?: () => void
  shareOpen?: boolean
  shareDisabled?: boolean
  /** Export with baked-in feedback; disabled until a doc exists. */
  onDownload?: () => void
  downloadDisabled?: boolean
  /** Log in (no auth yet — inert placeholder to match the design). */
  onLogin?: () => void
  /** Click the logo (e.g. start a new project / go home). */
  onLogoClick?: () => void
  /** Show the "Open source" GitHub pill at the start of the actions (Figma landing). */
  showOpenSource?: boolean
  /** Show the login (→) button. Hidden on the landing per Figma. */
  showLogin?: boolean
}

export default function TopBar({
  commentCount = 0,
  commentsOpen = false,
  onToggleComments,
  onUpload,
  onShare,
  shareOpen = false,
  shareDisabled = false,
  onDownload,
  downloadDisabled = false,
  onLogin,
  onLogoClick,
  showOpenSource = false,
  showLogin = true,
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

        {onUpload && (
          <FloatBtn title="Upload" onClick={onUpload}>
            <UploadIcon />
          </FloatBtn>
        )}

        <FloatBtn
          title="Comments"
          active={commentsOpen}
          badge={commentCount > 0 ? commentCount : undefined}
          onClick={onToggleComments}
        >
          <CommentIcon />
        </FloatBtn>

        <Pill
          title="Share"
          onClick={onShare}
          active={shareOpen}
          disabled={shareDisabled}
        >
          <ShareIcon />
          Share
        </Pill>

        <Pill
          title="Download"
          onClick={onDownload}
          disabled={downloadDisabled}
          disabledFilled
        >
          <DownloadIcon />
          Download
        </Pill>

        {showLogin && (
          <FloatBtn title="Log in" onClick={onLogin}>
            <LoginIcon />
          </FloatBtn>
        )}
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
  onClick,
}: {
  children: ReactNode
  title: string
  active?: boolean
  badge?: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        'relative grid size-9 place-items-center rounded-full transition',
        FLOAT_SHADOW,
        active ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-neutral-50',
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
  disabledFilled,
  onClick,
}: {
  children: ReactNode
  title: string
  active?: boolean
  disabled?: boolean
  /** Download's disabled state has a filled (#e8ebec) background. */
  disabledFilled?: boolean
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
          ? cn('cursor-not-allowed text-disabled', disabledFilled ? 'bg-line' : 'bg-white')
          : active
            ? 'bg-ink text-white'
            : 'bg-white text-ink hover:bg-neutral-50',
      )}
    >
      {children}
    </button>
  )
}
