import type { ChangeEvent, DragEvent } from 'react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '@/components/TopBar'
import HelpFab from '@/components/HelpFab'
import { useDocStore } from '@/store/useDocStore'
import { HTML_ACCEPT, isHtmlFile, readFileAsText } from '@/features/import/readHtmlFile'
import ImportingState from '@/features/import/ImportingState'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const STEPS = [
  {
    n: 'Step 1',
    title: 'Drop your HTML file',
    body: "Upload any HTML file and it's ready for comments",
    img: 'step1',
  },
  {
    n: 'Step 2',
    title: 'Share & Comment',
    body: 'Share the link, add a password, let anyone add comments directly on the preview link',
    img: 'step2',
  },
  {
    n: 'Step 3',
    title: 'Export & re-prompt',
    body: 'Download the HTML with comments baked-in, ready to re-prompt!',
    img: 'step3',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const setDoc = useDocStore((s) => s.setDoc)
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importFile(file: File) {
    if (!isHtmlFile(file)) {
      setError('Please choose an .html file.')
      return
    }
    setError(null)
    setPendingName(file.name)
    setImporting(true)
    try {
      const [html] = await Promise.all([readFileAsText(file), delay(650)])
      setDoc(html, file.name)
      navigate('/editor')
    } catch {
      setImporting(false)
      setError('Could not read that file. Please try again.')
    }
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void importFile(file)
    e.target.value = ''
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void importFile(file)
  }

  if (importing) return <ImportingState fileName={pendingName ?? undefined} />

  const base = import.meta.env.BASE_URL

  return (
    <div
      className="relative min-h-screen bg-dotgrid"
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragging) setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <TopBar shareDisabled downloadDisabled showOpenSource />
      <input ref={inputRef} type="file" accept={HTML_ACCEPT} className="hidden" onChange={onInputChange} />

      {/* note — visible only in this empty state (Figma) */}
      <div className="pointer-events-none absolute right-[72px] top-[76px] hidden items-end gap-2 lg:flex">
        <p className="pb-1 text-left text-xs leading-4 text-disabled">
          Once done collecting feedback,
          <br />
          download the <span className="italic">HTML+Comments file</span>
        </p>
        <img src={`${base}figma/note-arrow.svg`} alt="" className="h-[76px] w-[34px]" />
      </div>

      <main className="mx-auto flex min-h-screen w-[1011px] max-w-full flex-col items-center justify-center gap-10 px-6 py-24">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-medium leading-8 text-ink">
            Turn AI-generated HTML into team-approved HTML
          </h1>
          <p className="text-sm leading-5 text-muted">
            Multiplayer collaboration on HTML files – comment, share, and iterate live.
          </p>
        </div>

        <div className="flex w-full flex-col gap-6 rounded-2xl border border-line bg-white p-4 lg:w-auto lg:flex-row lg:items-stretch lg:justify-center lg:gap-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex w-full items-stretch gap-4 lg:w-auto">
              {i > 0 && <div className="hidden w-px self-stretch bg-line lg:block" />}
              <div className="flex w-full flex-col gap-8 lg:w-[220px]">
                <span className="inline-flex h-8 w-fit items-center rounded-lg border border-line bg-surface px-2 text-xs font-medium text-ink">
                  {s.n}
                </span>
                <div className="flex flex-col gap-5">
                  <p className="text-sm font-medium leading-5 text-ink">{s.title}</p>
                  <p className="text-sm leading-5 text-muted">{s.body}</p>
                </div>
                {/* mt-auto bottom-aligns the illustration boxes across cards */}
                <div className="mt-auto grid h-[140px] place-items-center overflow-hidden rounded bg-surface">
                  <img src={`${base}figma/steps/${s.img}.png`} alt="" className="max-h-[120px] w-auto object-contain" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-14 items-center justify-center rounded-full bg-black px-8 text-sm font-medium text-white shadow-[0px_4px_8px_0px_rgba(0,0,0,0.15)] transition hover:bg-black/90"
          >
            Import HTML
          </button>
          <p className="text-xs leading-4 text-muted">Or drag &amp; drop the file on the screen</p>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </main>

      <HelpFab />

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-white/80 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-ink px-12 py-10 text-center">
            <p className="text-lg font-semibold text-ink">Drop your HTML file</p>
            <p className="mt-1 text-sm text-muted">Release to import</p>
          </div>
        </div>
      )}
    </div>
  )
}
