import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** The currently-loaded HTML document being reviewed. */
type DocState = {
  html: string | null
  fileName: string | null
  setDoc: (html: string, fileName: string) => void
  reset: () => void
}

export const useDocStore = create<DocState>()(
  persist(
    (set) => ({
      html: null,
      fileName: null,
      setDoc: (html, fileName) => set({ html, fileName }),
      reset: () => set({ html: null, fileName: null }),
    }),
    { name: 'aifl:doc:v1' },
  ),
)
