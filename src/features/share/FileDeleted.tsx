import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo, DDocsLogo, DSheetsLogo, ExternalLinkIcon } from '@/components/icons'
import HelpFab from '@/components/HelpFab'

/** Stacked papers with a surprised face (Figma "Missed file" illustration). */
function MissedFileArt() {
  const offsets = [60, 48, 36, 24, 12, 0] // ml per sheet (back → front)
  return (
    <div className="relative" style={{ width: 151, height: 176 }} aria-hidden="true">
      {offsets.map((ml, i) => (
        <div
          key={ml}
          className="absolute rounded-[2px] border-4 border-black bg-brand"
          style={{ left: ml, top: i * 12, width: 91, height: 116 }}
        />
      ))}
      <svg
        className="absolute"
        style={{ left: 24.5, top: 88, width: 41, height: 45 }}
        viewBox="0 0 41 45"
        fill="none"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20.5 24C26.299 24 31 28.701 31 34.5C31 40.299 26.299 45 20.5 45C14.701 45 10 40.299 10 34.5C10 28.701 14.701 24 20.5 24ZM9 3C12.5899 3 15.5 5.91015 15.5 9.5C15.5 13.0899 12.5899 16 9 16C5.41015 16 2.5 13.0899 2.5 9.5C2.5 5.91015 5.41015 3 9 3ZM30 3C33.5899 3 36.5 5.91015 36.5 9.5C36.5 13.0899 33.5899 16 30 16C26.4101 16 23.5 13.0899 23.5 9.5C23.5 5.91015 26.4101 3 30 3Z"
          fill="#000"
        />
      </svg>
    </div>
  )
}

function ProductCard({
  logo,
  name,
  desc,
  href,
}: {
  logo: ReactNode
  name: string
  desc: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex w-full items-center gap-3 rounded-lg bg-surface px-4 py-3 transition hover:bg-line/60"
    >
      {logo}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-ink">{name}</p>
        <p className="truncate text-xs leading-4 text-muted">{desc}</p>
      </div>
      <span className="shrink-0 text-muted">
        <ExternalLinkIcon size={16} />
      </span>
    </a>
  )
}

/** Shown when a review link points at a share that no longer exists (Figma 232:2648). */
export default function FileDeleted() {
  return (
    <div className="relative min-h-screen bg-dotgrid">
      <div className="absolute left-6 top-6">
        <Logo />
      </div>

      <div className="mx-auto flex min-h-screen w-[420px] max-w-full flex-col items-center px-6 pb-12 pt-24">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <MissedFileArt />
          <div className="flex w-[380px] max-w-full flex-col items-center gap-2 text-center">
            <p className="text-lg font-medium leading-6 text-ink">File has been deleted</p>
            <p className="text-sm leading-5 text-muted">
              Try to reach out to the owner of this html for more information.{' '}
              <Link to="/" className="text-link hover:underline">
                Try your own collaborative HTML session
              </Link>
              !
            </p>
          </div>
        </div>

        <div className="flex w-[340px] max-w-full flex-col items-center gap-4">
          <p className="text-xs leading-4 text-muted">May we tempt you with a cup of privacy?</p>
          <div className="flex w-full flex-col gap-2">
            <ProductCard
              logo={<DDocsLogo size={24} />}
              name="dDocs"
              desc="Privacy-first & decentralized text editor"
              href="https://docs.fileverse.io"
            />
            <ProductCard
              logo={<DSheetsLogo size={24} />}
              name="dSheets"
              desc="Decentralised spreadsheets"
              href="https://sheets.fileverse.io"
            />
          </div>
        </div>
      </div>

      <HelpFab />
    </div>
  )
}
