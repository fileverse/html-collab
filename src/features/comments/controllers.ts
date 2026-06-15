import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCommentStore, type Comment, type CommentDraft } from '@/store/useCommentStore'
import {
  addShareComment,
  deleteShareComment,
  listShareComments,
  setShareCommentResolved,
  toComment,
} from '@/features/share/api'

/** Uniform comment surface so the editor/viewer don't care where comments live. */
export type CommentsController = {
  comments: Comment[]
  isRemote: boolean
  loading: boolean
  add: (draft: CommentDraft) => Promise<Comment | null>
  /** Owner-only; undefined hides the controls (e.g. public viewer). */
  resolve?: (id: string) => void
  remove?: (id: string) => void
  /**
   * Delete scoping: returns true if THIS client authored the comment, so an
   * anonymous viewer can delete their own. Undefined = no scoping (the owner may
   * delete every comment).
   */
  ownsComment?: (id: string) => boolean
  /** Remote-only; re-pulls from the server (manual sync). */
  refresh?: () => void
}

const byCreatedAt = (a: Comment, b: Comment) => a.createdAt - b.createdAt

/** Comments backed by the local persisted store (unshared documents). */
export function useLocalComments(docId: string): CommentsController {
  const all = useCommentStore((s) => s.comments)
  const addFn = useCommentStore((s) => s.add)
  const removeFn = useCommentStore((s) => s.remove)
  const toggleFn = useCommentStore((s) => s.toggleResolved)

  const comments = useMemo(
    () => all.filter((c) => c.docId === docId).sort(byCreatedAt),
    [all, docId],
  )

  return {
    comments,
    isRemote: false,
    loading: false,
    add: async (draft) => addFn(docId, draft),
    resolve: (id) => toggleFn(id),
    remove: (id) => removeFn(id),
  }
}

/**
 * Comments backed by a Supabase share (single source of truth). Polls every
 * 10s so guest comments appear without a reload. `shareId === null` makes the
 * hook fully inert (so it can be called unconditionally alongside the local one).
 */
export function useRemoteComments(
  shareId: string | null,
  password: string,
  versionNo: number,
  opts: { owner: boolean; author: string },
): CommentsController {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const authorRef = useRef(opts.author)
  authorRef.current = opts.author

  // Comments this client authored, so an anonymous viewer can delete their own.
  // (The server's delete is password-gated; the per-author scoping is ours.)
  // Persisted per share so it survives a reload.
  const [mine, setMine] = useState<Set<string>>(() => new Set())
  const mineRef = useRef(mine)
  mineRef.current = mine
  useEffect(() => {
    if (!shareId) return setMine(new Set())
    try {
      const raw = localStorage.getItem(`aifl:authored:${shareId}`)
      setMine(new Set(raw ? (JSON.parse(raw) as string[]) : []))
    } catch {
      setMine(new Set())
    }
  }, [shareId])
  const rememberMine = useCallback(
    (id: string) => {
      setMine((prev) => {
        if (prev.has(id)) return prev
        const next = new Set(prev).add(id)
        if (shareId) {
          try {
            localStorage.setItem(`aifl:authored:${shareId}`, JSON.stringify([...next]))
          } catch {
            /* storage disabled/full — the in-memory set still works this session */
          }
        }
        return next
      })
    },
    [shareId],
  )

  const refresh = useCallback(async () => {
    if (!shareId) return
    try {
      const list = await listShareComments(shareId, password, versionNo)
      setComments(list.map(toComment).sort(byCreatedAt))
    } catch {
      /* network blip — keep the last good set */
    }
  }, [shareId, password, versionNo])

  useEffect(() => {
    if (!shareId) {
      setComments([])
      return
    }
    let alive = true
    setComments([]) // version changed → don't show the previous version's pins
    setLoading(true)
    refresh().finally(() => alive && setLoading(false))
    const t = setInterval(refresh, 10_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [shareId, versionNo, refresh])

  const add = useCallback(
    async (draft: CommentDraft) => {
      if (!shareId) return null
      try {
        const sc = await addShareComment({
          shareId,
          password,
          versionNo,
          author: authorRef.current,
          anchor: draft.anchor,
          offset: draft.offset,
          body: draft.body,
        })
        const c = toComment(sc)
        rememberMine(c.id)
        setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c].sort(byCreatedAt)))
        return c
      } catch {
        return null
      }
    },
    [shareId, password, versionNo, rememberMine],
  )

  const resolve = useCallback(
    (id: string) => {
      if (!shareId) return
      let next = true
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c
          next = !c.resolved
          return { ...c, resolved: next }
        }),
      )
      setShareCommentResolved(shareId, password, id, next).catch(() => refresh())
    },
    [shareId, password, refresh],
  )

  const remove = useCallback(
    (id: string) => {
      if (!shareId) return
      // owner may delete any comment; a viewer only their own
      if (!opts.owner && !mineRef.current.has(id)) return
      setComments((prev) => prev.filter((c) => c.id !== id))
      deleteShareComment(shareId, password, id).catch(() => refresh())
    },
    [shareId, password, refresh, opts.owner],
  )

  return {
    comments,
    isRemote: true,
    loading,
    add,
    resolve: opts.owner ? resolve : undefined,
    remove,
    ownsComment: opts.owner ? undefined : (id: string) => mine.has(id),
    refresh,
  }
}
