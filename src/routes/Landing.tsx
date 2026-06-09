import type { ChangeEvent, DragEvent } from 'react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import TopBar from '@/components/TopBar'
import { HelpIcon } from '@/components/icons'
import { useDocStore } from '@/store/useDocStore'
import { HTML_ACCEPT, isHtmlFile, readFileAsText } from '@/features/import/readHtmlFile'
import ImportingState from '@/features/import/ImportingState'
import { SAMPLES, loadSampleHtml, sampleFileName } from '@/features/preview/samples'

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

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
    e.target.value = '' // allow re-selecting the same file
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void importFile(file)
  }

  async function loadSample(id: string) {
    const sample = SAMPLES.find((s) => s.id === id)
    if (!sample) return
    setError(null)
    setPendingName(sample.name)
    setImporting(true)
    try {
      const [html] = await Promise.all([loadSampleHtml(id), delay(400)])
      setDoc(html, sampleFileName(id))
      navigate('/editor')
    } catch {
      setImporting(false)
      setError('Could not load that sample. Please try again.')
    }
  }

  if (importing) return <ImportingState fileName={pendingName ?? undefined} />

  return (
    <div
      className="relative min-h-screen bg-white"
      onDragOver={(e) => {
        e.preventDefault()
        if (!dragging) setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <TopBar disabled />
      <input
        ref={inputRef}
        type="file"
        accept={HTML_ACCEPT}
        className="hidden"
        onChange={onInputChange}
      />

      <div className="pointer-events-none absolute right-8 top-24 hidden max-w-[210px] text-right text-sm leading-snug text-neutral-400 lg:block">
        Once done collecting feedback, download the HTML+Comments file
      </div>

      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-24">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Struggling with feedback for your AI agent's HTML?
        </h1>
        <p className="mt-3 text-center text-base text-neutral-500">
          Try our 1-click multiplayer collaboration for HTML files!
        </p>

        <div className="mt-12 grid w-full grid-cols-1 overflow-hidden rounded-2xl border border-neutral-200 sm:grid-cols-3">
          <StepCard
            step="Step 1"
            title="Drop your HTML file"
            body="Upload any HTML file and it's ready for comments"
            img="/illustrations/step1.png"
          />
          <StepCard
            step="Step 2"
            title="Share & Comment"
            body="Share the link, add a password, let anyone add comments directly on the preview link"
            img="/illustrations/step2.png"
            divider
          />
          <StepCard
            step="Step 3"
            title="Export & re-prompt"
            body="Download the HTML with comments baked-in, ready to re-prompt!"
            img="/illustrations/step3.png"
            divider
          />
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-12 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-neutral-800"
        >
          Import HTML
        </button>
        <p className="mt-3 text-sm text-neutral-400">Or drag &amp; drop the file on the screen</p>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
          <span>No file handy? Try a sample:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void loadSample(s.id)}
              className="rounded-full border border-neutral-200 px-2.5 py-1 font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              {s.name}
            </button>
          ))}
        </div>
      </main>

      <footer className="pointer-events-none absolute bottom-5 left-6 text-sm text-neutral-400">
        Open source
      </footer>
      <button
        type="button"
        title="Help"
        className="absolute bottom-5 right-6 grid h-11 w-11 place-items-center rounded-full bg-neutral-900 text-white shadow-lg transition hover:bg-neutral-800"
      >
        <HelpIcon />
      </button>

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-white/80 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-neutral-900 px-12 py-10 text-center">
            <p className="text-lg font-semibold text-neutral-900">Drop your HTML file</p>
            <p className="mt-1 text-sm text-neutral-500">Release to import</p>
          </div>
        </div>
      )}
    </div>
  )
}

function StepCard({
  step,
  title,
  body,
  img,
  divider,
}: {
  step: string
  title: string
  body: string
  img: string
  divider?: boolean
}) {
  return (
    <div className={cn('flex flex-col p-6', divider && 'border-neutral-200 sm:border-l')}>
      <span className="w-fit rounded-md border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600">
        {step}
      </span>
      <h3 className="mt-5 text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{body}</p>
      <div className="mt-6 grid h-36 place-items-center overflow-hidden rounded-xl bg-neutral-50">
        <img src={img} alt="" className="h-full w-full object-contain p-3" />
      </div>
    </div>
  )
}
