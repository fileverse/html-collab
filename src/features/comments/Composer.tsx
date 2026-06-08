import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import Avatar from './Avatar'

type Props = {
  author?: string
  onSubmit: (body: string) => void
  onCancel: () => void
}

/** Inline composer popover shown next to a freshly-placed pin. */
export default function Composer({ author = 'You', onSubmit, onCancel }: Props) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  const canSend = value.trim().length > 0
  const submit = () => {
    if (canSend) onSubmit(value.trim())
  }

  return (
    <div className="w-72 rounded-xl border border-line bg-white p-3 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)]">
      <div className="flex items-center gap-2">
        <Avatar name={author} />
        <span className="text-sm font-medium leading-5 text-ink">{author}</span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        rows={3}
        placeholder="Add your feedback…"
        className="mt-2 w-full resize-none rounded-lg border border-line p-2 text-sm leading-5 text-ink outline-none placeholder:text-muted focus:border-ink/30"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted">⏎ to send · Esc to cancel</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            className={cn(
              'rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition',
              canSend ? 'hover:bg-ink/90' : 'cursor-not-allowed opacity-40',
            )}
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  )
}
