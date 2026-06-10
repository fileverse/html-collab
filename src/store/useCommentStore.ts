import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Anchor } from '@/features/preview/types'

/** A persisted feedback comment, anchored to an element in the previewed doc. */
export type Comment = {
  id: string
  /** which document this belongs to (the imported file name, for the POC). */
  docId: string
  author: string
  /** stable reference to the target element (reused by the preview agent). */
  anchor: Anchor
  /** normalized point within the element (0..1) where the pin sits. */
  offset: { x: number; y: number }
  body: string
  createdAt: number
  resolved: boolean
}

/** The shape we get from the preview when an element is picked. */
export type CommentDraft = {
  anchor: Anchor
  offset: { x: number; y: number }
  body: string
}

type CommentState = {
  comments: Comment[]
  add: (docId: string, draft: CommentDraft, author?: string) => Comment
  remove: (id: string) => void
  toggleResolved: (id: string) => void
  /** Drop all comments for a document (used when the file is deleted). */
  clearDoc: (docId: string) => void
}

let seq = 0
const newId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`

export const useCommentStore = create<CommentState>()(
  persist(
    (set) => ({
      comments: [],
      add: (docId, draft, author = 'You') => {
        const comment: Comment = {
          id: newId(),
          docId,
          author,
          anchor: draft.anchor,
          offset: draft.offset,
          body: draft.body,
          createdAt: Date.now(),
          resolved: false,
        }
        set((s) => ({ comments: [...s.comments, comment] }))
        return comment
      },
      remove: (id) => set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),
      clearDoc: (docId) =>
        set((s) => ({ comments: s.comments.filter((c) => c.docId !== docId) })),
      toggleResolved: (id) =>
        set((s) => ({
          comments: s.comments.map((c) =>
            c.id === id ? { ...c, resolved: !c.resolved } : c,
          ),
        })),
    }),
    { name: 'aifl:comments:v1' },
  ),
)

/** Comments for a single document, oldest first (pin numbering order). */
export const selectDocComments = (docId: string) => (s: CommentState) =>
  s.comments.filter((c) => c.docId === docId).sort((a, b) => a.createdAt - b.createdAt)
