import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import agentRaw from './agent.js?raw'
import { cn } from '@/lib/cn'
import type { Comment, CommentDraft } from '@/store/useCommentStore'
import Composer from '@/features/comments/Composer'
import Avatar from '@/features/comments/Avatar'
import { formatTime } from '@/features/comments/format'
import { CloseIcon, ResolveIcon, TrashIcon, VerifiedBadge } from '@/components/icons'
import type { AgentMessage, Anchor, HostMessage, PreviewMode, Rect } from './types'

/**
 * Inject the agent script into arbitrary user HTML, just before the document's
 * own closing tag. We splice at the LAST </body> (not the first): a page can
 * embed earlier </body> tags inside an <iframe srcdoc="…"> or an HTML example,
 * and injecting into one of those leaves the top frame with no agent — so
 * hovering/commenting silently dies even though the page renders fine.
 */
function buildSrcDoc(html: string): string {
  const tag = `<script>${agentRaw}</script>`
  const spliceBeforeLast = (close: string): string | null => {
    const i = html.toLowerCase().lastIndexOf(close)
    return i === -1 ? null : html.slice(0, i) + tag + html.slice(i)
  }
  return spliceBeforeLast('</body>') ?? spliceBeforeLast('</html>') ?? html + tag
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
  /** Owner-only actions, shown in the focused-marker popover. */
  onResolve?: (id: string) => void
  onDelete?: (id: string) => void
  /** Per-comment delete gate (e.g. a viewer may only delete their own). When
   *  omitted, delete is allowed for every comment (owner). */
  canDelete?: (id: string) => boolean
}

export default function Preview({
  html,
  comments,
  activeId,
  mode,
  onSelect,
  onCreate,
  onResolve,
  onDelete,
  canDelete,
}: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{ rect: Rect; label: string } | null>(null)
  const [rects, setRects] = useState<Record<string, Rect | null>>({})
  const [draft, setDraft] = useState<Draft | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [contentWidth, setContentWidth] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Once we decide a doc is a genuinely-wide fixed layout we lock its design
  // width here and stop chasing the measurement (see the fit logic below). A ref
  // rather than state so writing it never itself triggers another measure.
  const designWidthRef = useRef(0)

  const srcDoc = useMemo(() => buildSrcDoc(html), [html])

  // New document → forget any locked design width and re-measure from scratch.
  useEffect(() => {
    designWidthRef.current = 0
    setContentWidth(0)
  }, [srcDoc])

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
        case 'size':
          setContentWidth(d.contentWidth)
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [initIframe])

  // Measure the preview surface so we can fit the (desktop-width) page into it.
  useEffect(() => {
    const el = surfaceRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Adaptive fit: render responsive pages at the surface width (1:1), but scale
  // genuinely-wide fixed-layout docs (e.g. 1920-wide slide decks) down so they
  // aren't cramped. Coordinates from the iframe are multiplied by `scale` to
  // place pins/composer on the overlay.
  //
  // The catch: a page can overflow its OWN viewport by a constant amount no
  // matter how wide we make it — a decorative blob at `right:-110px`, a negative
  // margin, `width:100vw` inside padding. If we just widened the iframe to that
  // measured `contentWidth`, the page would overflow again, we'd widen again,
  // and the preview would shrink forever. So we only treat a doc as "wide" when
  // its content clearly exceeds the surface (15%+), and we lock that design
  // width once — after which later (larger) measurements are ignored.
  const measured = size.w > 0 && size.h > 0
  if (measured && designWidthRef.current === 0 && contentWidth > size.w * 1.15) {
    designWidthRef.current = contentWidth
  }
  const logicalWidth = designWidthRef.current || size.w || 1280
  const scale = measured ? Math.min(1, size.w / logicalWidth) : 1

  function pinPoint(rect: Rect, offset: { x: number; y: number }) {
    return { left: (rect.x + rect.w * offset.x) * scale, top: (rect.y + rect.h * offset.y) * scale }
  }

  // Popover/composer sits beside the (already-scaled) marker, clamped to surface.
  function popoverPos(p: { left: number; top: number }) {
    const w = size.w || 800
    const h = size.h || 600
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
        className="absolute left-0 top-0 border-0 bg-white"
        style={
          measured
            ? {
                width: logicalWidth,
                height: size.h / scale,
                transform: `scale(${scale})`,
                transformOrigin: '0 0',
              }
            : { width: '100%', height: '100%' }
        }
      />

      {/* overlay — transparent to pointer events so the iframe receives them;
          only the pins + composer opt back in. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* click-outside backdrop: while a comment is focused, a click anywhere
            off the popover/markers dismisses it (markers + popover sit above). */}
        {activeId && !draft && (
          <button
            type="button"
            aria-label="Close comment"
            onClick={() => onSelect(null)}
            className="pointer-events-auto absolute inset-0 cursor-default"
          />
        )}
        {mode === 'comment' && hover && !draft && (
          <div
            className="absolute rounded-[4px] bg-brand/[0.08] ring-2 ring-brand/60"
            style={{
              left: hover.rect.x * scale,
              top: hover.rect.y * scale,
              width: hover.rect.w * scale,
              height: hover.rect.h * scale,
            }}
          />
        )}

        {/* markers — small avatar dots; resolved ones stay in the sidebar only */}
        {!draft &&
          comments.map((c) => {
            if (c.resolved) return null
            const r = rects[c.id]
            if (!r) return null
            const { left, top } = pinPoint(r, c.offset)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(activeId === c.id ? null : c.id)}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left, top }}
              >
                <Marker name={c.author} active={activeId === c.id} />
              </button>
            )
          })}

        {/* one popover: focused (clicked) marker, else a hover preview */}
        {!draft &&
          (() => {
            const id = activeId ?? hoveredId
            if (!id) return null
            const c = comments.find((x) => x.id === id)
            const r = c && rects[id]
            if (!c || !r) return null
            const focused = activeId === id
            return (
              <div
                className={cn('absolute', focused ? 'pointer-events-auto z-20' : 'pointer-events-none z-10')}
                style={popoverPos(pinPoint(r, c.offset))}
              >
                <CommentPopover
                  comment={c}
                  focused={focused}
                  onResolve={onResolve}
                  onDelete={onDelete && (!canDelete || canDelete(c.id)) ? onDelete : undefined}
                  onClose={() => onSelect(null)}
                />
              </div>
            )
          })()}

        {draft && (
          <>
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={pinPoint(draft.rect, draft.offset)}
            >
              <span className="block size-5 rounded-full rounded-bl-none bg-brand shadow-md ring-2 ring-white" />
            </div>
            <div
              className="pointer-events-auto absolute z-20"
              style={popoverPos(pinPoint(draft.rect, draft.offset))}
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

/** Small avatar marker (Figma comment mark). */
function Marker({ name, active }: { name: string; active: boolean }) {
  return (
    <span
      className={cn(
        'block rounded-full shadow-[0px_2px_6px_0px_rgba(0,0,0,0.25)] ring-2 transition',
        active ? 'scale-110 ring-ink' : 'ring-white hover:scale-110',
      )}
    >
      <Avatar name={name} size={24} />
    </span>
  )
}

/** Hover preview (read-only) / focused thread for a comment marker. */
function CommentPopover({
  comment,
  focused,
  onResolve,
  onDelete,
  onClose,
}: {
  comment: Comment
  focused: boolean
  onResolve?: (id: string) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="w-72 rounded-xl border border-line bg-white p-3 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)]">
      <div className="flex items-center gap-2">
        <Avatar name={comment.author} />
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <span className="truncate text-sm font-medium text-ink">{comment.author}</span>
          <VerifiedBadge />
        </div>
        <span className="shrink-0 text-xs text-muted">{formatTime(comment.createdAt)}</span>
        {focused && (
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="grid size-6 place-items-center rounded text-muted transition hover:bg-black/5"
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>
      <p className={cn('mt-2 whitespace-pre-wrap text-sm leading-5 text-ink', !focused && 'line-clamp-4')}>
        {comment.body}
      </p>
      {focused && (onResolve || onDelete) && (
        <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
          {onResolve && (
            <button
              type="button"
              onClick={() => {
                onResolve(comment.id)
                onClose()
              }}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:bg-emerald-50 hover:text-emerald-600"
            >
              <ResolveIcon size={13} /> Resolve
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(comment.id)
                onClose()
              }}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:bg-red-50 hover:text-red-500"
            >
              <TrashIcon size={13} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
