import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Remembers which local documents have been shared, so the editor can switch a
 * shared doc to read/write its comments from Supabase (single source of truth)
 * and re-authenticate as the owner across reloads.
 *
 * Note: the share password is kept in localStorage on the owner's own machine.
 * Fine for this POC; a production build would use an owner token instead.
 */
export type ShareRecord = {
  shareId: string
  password: string
  createdAt: number
}

type ShareState = {
  byDoc: Record<string, ShareRecord>
  setShare: (docId: string, rec: ShareRecord) => void
  clearShare: (docId: string) => void
}

export const useShareStore = create<ShareState>()(
  persist(
    (set) => ({
      byDoc: {},
      setShare: (docId, rec) =>
        set((s) => ({ byDoc: { ...s.byDoc, [docId]: rec } })),
      clearShare: (docId) =>
        set((s) => {
          const next = { ...s.byDoc }
          delete next[docId]
          return { byDoc: next }
        }),
    }),
    { name: 'aifl:shares:v1' },
  ),
)
