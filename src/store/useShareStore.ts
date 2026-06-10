import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Metadata for one version of a shared project (no html — fetched on demand). */
export type VersionMeta = {
  no: number
  fileName: string
  createdAt: number
}

/**
 * Remembers which local documents have been shared, so the editor can switch a
 * shared doc to read/write its comments from Supabase (single source of truth)
 * and re-authenticate as the owner across reloads.
 *
 * A share is a "project" holding 1–3 versions (review rounds). The active
 * version drives which html + comments the editor shows.
 *
 * Note: the share password is kept in localStorage on the owner's own machine.
 * Destructive actions are gated by the secret ownerToken, not the password.
 */
export type ShareRecord = {
  shareId: string
  password: string
  /** Secret proving ownership — required to change the password or delete. */
  ownerToken: string
  createdAt: number
  /** All versions of this share (newest = highest number). */
  versions: VersionMeta[]
  /** Which version the editor is currently showing. */
  activeVersion: number
}

type ShareState = {
  byDoc: Record<string, ShareRecord>
  setShare: (docId: string, rec: ShareRecord) => void
  /** Patch fields of an existing share record (e.g. password, versions). */
  patchShare: (docId: string, patch: Partial<ShareRecord>) => void
  clearShare: (docId: string) => void
}

export const useShareStore = create<ShareState>()(
  persist(
    (set) => ({
      byDoc: {},
      setShare: (docId, rec) =>
        set((s) => ({ byDoc: { ...s.byDoc, [docId]: rec } })),
      patchShare: (docId, patch) =>
        set((s) => {
          const cur = s.byDoc[docId]
          if (!cur) return s
          return { byDoc: { ...s.byDoc, [docId]: { ...cur, ...patch } } }
        }),
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
