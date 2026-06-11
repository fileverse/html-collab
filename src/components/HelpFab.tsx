import { useState } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon, DDocsLogo, DSheetsLogo, ExternalLinkIcon, GitHubIcon } from './icons'

/** Roadmap + products menu behind the bottom-right "?" (Figma node 104:2715). */
const WHATS_NEXT = ['Create account', 'E2E encryption', 'Connect LLM']

export default function HelpFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="w-64 rounded-2xl border border-line bg-white p-2 shadow-[0px_8px_32px_0px_rgba(0,0,0,0.18)]">
            <p className="px-2 pb-1 pt-2 text-xs text-muted">What’s next</p>
            {WHATS_NEXT.map((label) => (
              <div key={label} className="flex items-center justify-between rounded-lg px-2 py-1.5">
                <span className="text-sm font-medium text-ink">{label}</span>
                <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-ink">
                  Soon
                </span>
              </div>
            ))}

            <p className="px-2 pb-1 pt-3 text-xs text-muted">Try other files</p>
            <MenuLink href="https://docs.fileverse.io" label="dDocs" icon={<DDocsLogo size={18} />} />
            <MenuLink href="https://sheets.fileverse.io" label="dSheets" icon={<DSheetsLogo size={18} />} />

            <p className="px-2 pb-1 pt-3 text-xs text-muted">Other</p>
            <MenuLink
              href="https://github.com/fileverse/ai-feedback-loop"
              label="Open source"
              icon={<GitHubIcon size={16} />}
            />
          </div>
        )}

        <button
          type="button"
          title="What’s next"
          onClick={() => setOpen((o) => !o)}
          className="grid size-11 place-items-center rounded-full bg-ink text-white shadow-[0px_4px_12px_0px_rgba(0,0,0,0.2)] transition hover:bg-ink/90"
        >
          {open ? <CloseIcon size={16} /> : <span className="text-lg font-semibold leading-none">?</span>}
        </button>
      </div>
    </>
  )
}

function MenuLink({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface"
    >
      {icon ?? <span className="size-4 shrink-0 rounded bg-brand" />}
      <span className="flex-1 text-sm font-medium text-ink">{label}</span>
      <ExternalLinkIcon size={13} className="text-muted" />
    </a>
  )
}
