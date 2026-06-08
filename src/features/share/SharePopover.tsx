import { useState } from 'react'
import { cn } from '@/lib/cn'
import { CloseIcon, ShareIcon } from '@/components/icons'
import { isSupabaseConfigured } from '@/lib/supabase'
import { createShare, type NewComment } from './api'

type Props = {
  fileName: string
  html: string
  comments: NewComment[]
  /** Set if this doc was already shared — shows the existing link. */
  existingShareId?: string
  existingHasPassword?: boolean
  /** Called once a share exists, so the editor can remember it. */
  onShared?: (shareId: string, password: string) => void
  onClose: () => void
}

/** Share card (Figma): create a password-optional public review link. */
export default function SharePopover({
  fileName,
  html,
  comments,
  existingShareId,
  existingHasPassword = false,
  onShared,
  onClose,
}: Props) {
  const [requirePassword, setRequirePassword] = useState(existingHasPassword)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(
    existingShareId ? `${window.location.origin}/r/${existingShareId}` : null,
  )
  const [copied, setCopied] = useState(false)

  async function create() {
    if (requirePassword && !password.trim()) {
      setError('Enter a password or uncheck "Password required".')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const pwd = requirePassword ? password.trim() : ''
      const id = await createShare({ fileName, html, password: pwd, comments })
      setLink(`${window.location.origin}/r/${id}`)
      onShared?.(id, pwd)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the link.')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div className="w-[420px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-white p-4 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)]">
      <div className="flex items-start justify-between">
        {link ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
            Live
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Accepting comments
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
            <ShareIcon size={16} /> Share for review
          </span>
        )}
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="grid size-6 place-items-center rounded text-ink transition hover:bg-black/5"
        >
          <CloseIcon />
        </button>
      </div>

      <p className="mt-3 text-sm font-medium text-ink">
        <span className="font-semibold">{fileName}</span> ready for review
      </p>
      <p className="mt-1 text-xs leading-5 text-muted">
        Share the link below with anyone who should review this file.
      </p>

      {!isSupabaseConfigured ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Sharing isn’t configured. Add VITE_SUPABASE_* to .env.local.
        </p>
      ) : link ? (
        <div className="mt-3">
          <div className="rounded-xl border border-line bg-black/[0.02] p-3">
            <p className="text-xs text-muted">Public review link</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{link}</span>
              <button
                type="button"
                onClick={copy}
                className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink/90"
              >
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
          {requirePassword && (
            <p className="mt-2 text-xs text-muted">🔒 Password protected — share it separately.</p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={requirePassword}
              onChange={(e) => setRequirePassword(e.target.checked)}
              className="size-4 accent-neutral-900"
            />
            Password required
          </label>
          {requirePassword && (
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password"
              className="mt-2 w-full rounded-lg border border-line p-2 text-sm text-ink outline-none placeholder:text-muted focus:border-ink/30"
            />
          )}
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={create}
            disabled={busy}
            className={cn(
              'mt-3 w-full rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/90',
              busy && 'cursor-wait opacity-60',
            )}
          >
            {busy ? 'Creating link…' : 'Create review link'}
          </button>
        </div>
      )}
    </div>
  )
}
