import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { DownloadIcon, Logo } from '@/components/icons'
import Preview from '@/features/preview/Preview'
import CommentDrawer from '@/features/comments/CommentDrawer'
import { useRemoteComments } from '@/features/comments/controllers'
import { downloadFeedbackFile } from '@/features/export/exportDoc'
import { fetchShare, fetchShareMeta } from '@/features/share/api'

type Phase = 'loading' | 'notfound' | 'locked' | 'opening' | 'ready' | 'error'

export default function Review() {
  const { shareId } = useParams<{ shareId: string }>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [fileName, setFileName] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Comments come from the shared source of truth once unlocked (add-only).
  const ctrl = useRemoteComments(phase === 'ready' ? (shareId ?? null) : null, password, {
    owner: false,
    author: name.trim() || 'Guest',
  })

  useEffect(() => {
    if (!shareId) return
    let cancelled = false
    ;(async () => {
      try {
        const meta = await fetchShareMeta(shareId)
        if (cancelled) return
        if (!meta.exists) return setPhase('notfound')
        setFileName(meta.file_name)
        if (meta.requires_password) setPhase('locked')
        else await open('')
      } catch {
        if (!cancelled) setPhase('error')
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId])

  async function open(pwd: string) {
    if (!shareId) return
    setGateError(null)
    setPhase('opening')
    try {
      const d = await fetchShare(shareId, pwd) // validates password + returns html
      setHtml(d.html)
      setFileName(d.file_name)
      setPassword(pwd)
      setPhase('ready')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      if (msg === 'invalid_password') {
        setGateError('Wrong password — try again.')
        setPhase('locked')
      } else if (msg === 'not_found') setPhase('notfound')
      else setPhase('error')
    }
  }

  if (phase === 'loading' || phase === 'opening') return <Centered>Loading…</Centered>
  if (phase === 'notfound') return <Centered>This review link doesn’t exist or was removed.</Centered>
  if (phase === 'error') return <Centered>Something went wrong loading this link.</Centered>

  if (phase === 'locked') {
    return (
      <div className="grid min-h-screen place-items-center bg-dotgrid px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void open(password)
          }}
          className="flex w-[400px] max-w-[calc(100vw-2rem)] flex-col items-center rounded-2xl border border-line bg-white p-8 text-center shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)]"
        >
          <Logo size={48} />
          <h1 className="mt-5 text-xl font-medium text-ink">Password required</h1>
          <p className="mt-1.5 text-sm text-muted">You need a password to access this file</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-5 w-full rounded-lg border border-line p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-ink/30"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="mt-2 w-full rounded-lg border border-line p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-ink/30"
          />
          {gateError && <p className="mt-2 w-full text-left text-xs text-red-500">{gateError}</p>}
          <button
            type="submit"
            className="mt-3 w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-black/90"
          >
            Continue
          </button>
        </form>
      </div>
    )
  }

  // ready
  return (
    <div className="relative min-h-screen bg-dotgrid">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
        <div className="pointer-events-auto flex items-center gap-3">
          <Logo />
          <span className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
            {fileName}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Shared for review
          </span>
        </div>
        <div className="pointer-events-auto flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Commenting as
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guest"
              className="w-28 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink outline-none placeholder:text-muted focus:border-ink/30"
            />
          </label>
          <button
            type="button"
            onClick={() => html && downloadFeedbackFile(html, fileName, ctrl.comments)}
            className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
          >
            <DownloadIcon size={16} />
            Download
          </button>
        </div>
      </header>

      <div className="mx-auto flex h-screen max-w-7xl flex-col px-6 pb-6 pt-[72px]">
        <div className="flex flex-1 gap-3 overflow-hidden">
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {html && (
            <Preview
              key={shareId}
              html={html}
              comments={ctrl.comments}
              activeId={activeId}
              mode="comment"
              onSelect={setActiveId}
              onCreate={async (draft) => {
                const c = await ctrl.add(draft)
                if (c) setActiveId(c.id)
              }}
            />
          )}
          </div>
          <div className="h-full shrink-0">
            <CommentDrawer comments={ctrl.comments} activeId={activeId} onSelect={setActiveId} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-dotgrid px-6 text-center">
      <p className="text-sm text-neutral-500">{children}</p>
    </div>
  )
}
