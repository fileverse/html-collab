import { useState } from 'react'
import { cn } from '@/lib/cn'
import { CloseIcon, LinkIcon } from '@/components/icons'
import { isSupabaseConfigured } from '@/lib/supabase'

type Props = {
  fileName: string
  /** Share id (auto-created at import); null while creating / unavailable. */
  shareId: string | null
  /** Whether the share currently has a password. */
  hasPassword: boolean
  /** Apply a new password ('' disables). Resolves false on failure. */
  onSetPassword: (newPassword: string) => Promise<boolean>
  onClose: () => void
}

/** Share card (Figma): live link + password set / reset / disable. */
export default function SharePopover({
  fileName,
  shareId,
  hasPassword,
  onSetPassword,
  onClose,
}: Props) {
  const [checked, setChecked] = useState(hasPassword)
  const [editing, setEditing] = useState(false)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDisable, setConfirmDisable] = useState(false)
  const [copied, setCopied] = useState(false)

  const link = shareId ? `${window.location.origin}/r/${shareId}` : null

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

  async function save() {
    if (!password.trim()) return
    setBusy(true)
    setError(null)
    const ok = await onSetPassword(password.trim())
    setBusy(false)
    if (ok) {
      setEditing(false)
      setPassword('')
    } else {
      setError('Could not save the password. Try again.')
    }
  }

  async function disable() {
    setBusy(true)
    setError(null)
    const ok = await onSetPassword('')
    setBusy(false)
    setConfirmDisable(false)
    if (ok) setChecked(false)
    else setError('Could not disable password access. Try again.')
  }

  function toggleCheckbox(next: boolean) {
    if (!next && hasPassword) {
      setConfirmDisable(true) // confirm before turning protection off
      return
    }
    setChecked(next)
    setEditing(next && !hasPassword)
  }

  return (
    <div className="w-[620px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-line bg-white p-4 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)]">
      {/* header: Live pill + close */}
      <div className="flex items-start justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-2 text-xs font-medium leading-4 text-[#177e23]">
          Live
          <span className="size-1.5 rounded-full bg-[#177e23]" />
          Accepting comments
        </span>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-lg text-ink transition hover:bg-black/5"
        >
          <CloseIcon size={14} />
        </button>
      </div>

      <p className="mt-4 text-sm font-medium leading-5 text-ink">{fileName} ready for review</p>
      <p className="mt-1 text-sm leading-5 text-muted">
        Share the link below with anyone who should review this file.
      </p>

      {!isSupabaseConfigured ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Sharing isn’t configured. Add VITE_SUPABASE_* to .env.local.
        </p>
      ) : (
        <>
          {/* link box */}
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <div className="border-b border-line bg-surface px-4 py-2 text-xs leading-4 text-muted">
              Public review link
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm leading-5 text-ink">
                {link ?? 'Creating link…'}
              </span>
              <button
                type="button"
                onClick={copy}
                disabled={!link}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded px-2 py-1 text-sm font-medium transition',
                  link ? 'text-ink hover:bg-black/5' : 'cursor-not-allowed text-disabled',
                )}
              >
                <LinkIcon size={16} />
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>

          {/* password */}
          <div className="mt-4">
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={checked}
                disabled={!shareId || busy}
                onChange={(e) => toggleCheckbox(e.target.checked)}
                className="size-4 accent-black"
              />
              Password required
            </label>

            {checked && hasPassword && !editing && (
              <p className="mt-2 text-xs leading-4 text-muted">
                Password access enabled.{' '}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="font-medium text-link hover:underline"
                >
                  Reset
                </button>
              </p>
            )}

            {checked && editing && (
              <div className="mt-2 flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void save()
                      }
                    }}
                    placeholder="Enter password"
                    autoFocus
                    className="w-full rounded-lg border border-line p-2.5 pr-9 text-sm text-ink outline-none placeholder:text-muted focus:border-ink/30"
                  />
                  <button
                    type="button"
                    title={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink"
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!password.trim() || busy}
                  className={cn(
                    'shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition',
                    password.trim() && !busy
                      ? 'bg-black text-white hover:bg-black/90'
                      : 'cursor-not-allowed bg-line text-disabled',
                  )}
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          </div>
        </>
      )}

      {/* disable-password confirm (Figma modal) */}
      {confirmDisable && (
        <ConfirmDialog
          title="Disable password access"
          body="You are about to disable password protected access. Anyone with the link to this file will be able to access your file."
          confirmLabel={busy ? 'Disabling…' : 'Yes, disable'}
          onCancel={() => setConfirmDisable(false)}
          onConfirm={() => void disable()}
        />
      )}
    </div>
  )
}

/** Small centered confirm dialog (Figma: disable password access). */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string
  body: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6">
      <div className="w-[400px] max-w-full rounded-2xl bg-white p-5 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.25)]">
        <p className="text-sm font-medium leading-5 text-ink">{title}</p>
        <p className="mt-2 text-sm leading-5 text-muted">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
