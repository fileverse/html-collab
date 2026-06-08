import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import agentRaw from './agent.js?raw'
import { cn } from '@/lib/cn'
import type { Comment, CommentDraft } from '@/store/useCommentStore'
import Composer from '@/features/comments/Composer'
import type { AgentMessage, Anchor, HostMessage, PreviewMode, Rect } from './types'

/** Inject the agent script into arbitrary user HTML, just before </body>. */
function buildSrcDoc(html: string): string {
  const tag = `<script>${agentRaw}</script>`
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${tag}</body>`)
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${tag}</html>`)
  return html + tag
}

type Draft = { anchor: Anchor; offset: { x: number; y: number }; rect: Rect }

type PreviewProps = {
  html: string
  comments: Comment[]
  activeId: string | null
  /** 'comment' lets the user pick elements; 'view' is a normal page. */
  mode: PreviewMode
  onSelect: (id: string | null) => void
  onCreate: (draft: CommentDraft) => void
}

export default function Preview({ html, comments, activeId, mode, onSelect, onCreate }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ rect: Rect; label: string } | null>(null)
  const [rects, setRects] = useState<Record<string, Rect | null>>({})
  const [draft, setDraft] = useState<Draft | null>(null)

  const srcDoc = useMemo(() => buildSrcDoc(html), [html])

  const send = useCallback((msg: HostMessage) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*')
  }, [])

  // Refs so the (load-time) init can read current values without re-binding.
  const commentsRef = useRef(comments)
  commentsRef.current = comments
  const modeRef = useRef(mode)
  modeRef.current = mode

  const pushTrack = useCallback(
    (list: Comment[]) => {
      send({ source: 'aifl-host', type: 'track', anchors: list.map((c) => ({ id: c.id, ...c.anchor })) })
    },
    [send],
  )

  const initIframe = useCallback(() => {
    send({ source: 'aifl-host', type: 'init', mode: modeRef.current })
    pushTrack(commentsRef.current)
  }, [send, pushTrack])

  // Re-track whenever the comment set changes; re-send mode whenever it changes.
  useEffect(() => {
    pushTrack(comments)
  }, [comments, pushTrack])
  useEffect(() => {
    send({ source: 'aifl-host', type: 'setMode', mode })
    if (mode !== 'comment') {
      setDraft(null)
      setHover(null)
    }
  }, [mode, send])

  // Scroll the previewed element into view when a comment becomes active.
  useEffect(() => {
    if (!activeId) return
    const c = comments.find((x) => x.id === activeId)
    if (c) send({ source: 'aifl-host', type: 'focus', anchor: c.anchor })
  }, [activeId, comments, send])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return
      const d = e.data as AgentMessage
      if (!d || d.source !== 'aifl-agent') return
      switch (d.type) {
        case 'ready':
          initIframe()
          break
        case 'hover':
          setHover(d.rect ? { rect: d.rect, label: d.label ?? '' } : null)
          break
        case 'pick':
          setDraft({ anchor: d.anchor, offset: d.offset, rect: d.rect })
          setHover(null)
          break
        case 'rects':
          setRects((prev) => {
            const next = { ...prev }
            for (const r of d.rects) next[r.id] = r.rect
            return next
          })
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [initIframe])

  function pinPoint(rect: Rect, offset: { x: number; y: number }) {
    return { left: rect.x + rect.w * offset.x, top: rect.y + rect.h * offset.y }
  }

  // Composer sits beside the draft pin, clamped to the preview surface.
  function composerPos(p: { left: number; top: number }) {
    const w = surfaceRef.current?.clientWidth ?? 800
    const h = surfaceRef.current?.clientHeight ?? 600
    const left = p.left + 300 > w ? p.left - 300 : p.left + 12
    return {
      left: Math.max(8, Math.min(left, w - 296)),
      top: Math.max(8, Math.min(p.top, h - 200)),
    }
  }

  return (
    <div ref={surfaceRef} className="relative h-full w-full overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        title="HTML preview"
        srcDoc={srcDoc}
        onLoad={initIframe}
        sandbox="allow-scripts allow-popups allow-forms allow-modals"
        className="absolute inset-0 h-full w-full border-0 bg-white"
      />

      {/* overlay — transparent to pointer events so the iframe receives them;
          only the pins + composer opt back in. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {mode === 'comment' && hover && !draft && (
          <div
            className="absolute rounded-sm bg-brand/15 ring-2 ring-brand"
            style={{ left: hover.rect.x, top: hover.rect.y, width: hover.rect.w, height: hover.rect.h }}
          />
        )}

        {comments.map((c, i) => {
          const r = rects[c.id]
          if (!r) return null
          const { left, top } = pinPoint(r, c.offset)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(activeId === c.id ? null : c.id)}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
              style={{ left, top }}
            >
              <Pin active={activeId === c.id} resolved={c.resolved} n={i + 1} />
            </button>
          )
        })}

        {draft && (
          <>
            <div
              className="absolute -translate-x-1/2 -translate-y-full"
              style={pinPoint(draft.rect, draft.offset)}
            >
              <Pin active n={comments.length + 1} />
            </div>
            <div
              className="pointer-events-auto absolute z-10"
              style={composerPos(pinPoint(draft.rect, draft.offset))}
            >
              <Composer
                onSubmit={(body) => {
                  onCreate({ anchor: draft.anchor, offset: draft.offset, body })
                  setDraft(null)
                }}
                onCancel={() => setDraft(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Pin({ active, resolved, n }: { active: boolean; resolved?: boolean; n: number }) {
  return (
    <span
      className={cn(
        'grid h-6 min-w-6 select-none place-items-center rounded-full rounded-bl-none px-1.5 text-xs font-bold shadow-md ring-2 ring-white transition',
        active ? 'bg-ink text-white' : 'bg-brand text-ink',
        resolved && !active && 'bg-neutral-300 text-neutral-600',
      )}
    >
      {n}
    </span>
  )
}
