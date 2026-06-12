import type { Comment } from '@/store/useCommentStore'

/**
 * Export — make the collected feedback something an AI agent can reliably act
 * on, three reinforcing ways:
 *
 *  1. inline `data-feedback` attributes on each target element, so an agentic
 *     file-editor sees the ask right where it edits;
 *  2. a prominent re-prompt directive injected at the TOP of <head> (read first
 *     by top-down agents);
 *  3. a machine-readable <script type="application/json"> snapshot for re-import.
 *
 * `copyReprompt()` gives the same directive as plain text for pasting into chat.
 */

const MARKER_START = 'AI-FEEDBACK-LOOP:BEGIN'
const MARKER_END = 'AI-FEEDBACK-LOOP:END'

/** Directive + numbered feedback list (open comments only). Plain text. */
export function buildReprompt(comments: Comment[], opts: { inline?: boolean } = {}): string {
  const open = comments.filter((c) => !c.resolved)
  const lines = [
    'AI FEEDBACK LOOP — REVISION REQUEST',
    '',
    'This HTML was reviewed and has feedback to apply. Make ALL of the changes',
    'listed below to the markup, then return the COMPLETE, updated HTML file.',
    'Keep everything else unchanged.',
    '',
    'Each item points to one element by CSS selector (and id), with a snippet of',
    'its current text to help you locate it.',
  ]
  if (opts.inline) {
    lines.push(
      '',
      'The same feedback is attached inline as a `data-feedback` attribute on each',
      'target element. Apply each change and REMOVE the data-feedback attribute.',
    )
  }
  lines.push('')

  if (open.length === 0) {
    lines.push('(No open feedback.)')
  } else {
    lines.push(`OPEN FEEDBACK (${open.length}):`, '')
    open.forEach((c, i) => {
      lines.push(`${i + 1}. Element:  ${c.anchor.label}   (selector: ${c.anchor.selector})`)
      if (c.anchor.quote) lines.push(`   Current:  "${c.anchor.quote}"`)
      lines.push(`   Change:   ${c.body}   — ${c.author}`, '')
    })
  }
  lines.push('— end of feedback —')
  return lines.join('\n')
}

/** Tag each open comment's target element with a `data-feedback` attribute. */
function annotateElements(html: string, comments: Comment[]): string {
  const open = comments.filter((c) => !c.resolved)
  if (open.length === 0 || typeof DOMParser === 'undefined') return html

  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, 'text/html')
  } catch {
    return html
  }

  for (const c of open) {
    let el: Element | null = null
    if (c.anchor.elementId) el = doc.getElementById(c.anchor.elementId)
    if (!el && c.anchor.selector) {
      try {
        el = doc.querySelector(c.anchor.selector)
      } catch {
        /* invalid selector — skip */
      }
    }
    if (!el) continue
    const note = `${c.body} — ${c.author}`
    const existing = el.getAttribute('data-feedback')
    el.setAttribute('data-feedback', existing ? `${existing} ¶ ${note}` : note)
  }

  const serialized = doc.documentElement.outerHTML
  return /<!doctype/i.test(html) ? `<!doctype html>\n${serialized}` : serialized
}

/** Full exportable HTML: inline data-feedback + top re-prompt + JSON snapshot. */
export function buildExportHtml(html: string, comments: Comment[], fileName: string): string {
  const reprompt = buildReprompt(comments, { inline: true }).replace(/--+>/g, '-- >')
  const topBlock = `<!-- ${MARKER_START} (${fileName})\n\n${reprompt}\n\n${MARKER_END} -->`

  const snapshot = {
    generator: 'ai-feedback-loop',
    file: fileName,
    exportedAt: new Date().toISOString(),
    comments,
  }
  const json = JSON.stringify(snapshot, null, 2).replace(/</g, '\\u003c')
  const jsonBlock = `<script type="application/json" id="aifl-comments">\n${json}\n</script>`

  let out = annotateElements(html, comments)
  if (/<head[^>]*>/i.test(out)) out = out.replace(/(<head[^>]*>)/i, `$1\n${topBlock}`)
  else if (/<html[^>]*>/i.test(out)) out = out.replace(/(<html[^>]*>)/i, `$1\n${topBlock}`)
  else out = `${topBlock}\n${out}`

  // Splice before the LAST </body> (the document's own): a page may embed an
  // earlier </body> inside an <iframe srcdoc="…">, and baking the snapshot into
  // that nested frame would hide it from re-import.
  const lastBody = out.toLowerCase().lastIndexOf('</body>')
  if (lastBody === -1) out = `${out}\n${jsonBlock}\n`
  else out = out.slice(0, lastBody) + `${jsonBlock}\n` + out.slice(lastBody)

  return out
}

/** Derive the download name, e.g. "Landing (ONY).html" → "Landing (ONY).feedback.html". */
export function exportFileName(fileName: string): string {
  return fileName.replace(/\.html?$/i, '') + '.feedback.html'
}

/** Trigger a browser download of the baked HTML file. */
export function downloadFeedbackFile(html: string, fileName: string, comments: Comment[]): void {
  const content = buildExportHtml(html, comments, fileName)
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = exportFileName(fileName)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Copy the re-prompt to the clipboard (paste into any AI chatbot to re-prompt). */
export async function copyReprompt(comments: Comment[]): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildReprompt(comments))
    return true
  } catch {
    return false
  }
}
