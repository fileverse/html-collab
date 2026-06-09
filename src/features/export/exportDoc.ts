import type { Comment } from '@/store/useCommentStore'

/**
 * Export — make the collected feedback something an AI agent can reliably act
 * on. Two complementary outputs:
 *
 *  - downloadFeedbackFile(): the original HTML with a prominent re-prompt block
 *    injected near the TOP (an HTML comment, read first by top-down agents) plus
 *    a machine-readable <script type="application/json"> snapshot at the bottom
 *    so the file can be re-imported with its comments intact.
 *  - copyReprompt(): the same instructions as plain text, for pasting straight
 *    into a chat agent alongside the file — the most reliable path.
 *
 * The original markup is otherwise left untouched.
 */

const MARKER_START = 'AI-FEEDBACK-LOOP:BEGIN'
const MARKER_END = 'AI-FEEDBACK-LOOP:END'

/** Directive + numbered feedback list (open comments only). Plain text. */
export function buildReprompt(comments: Comment[]): string {
  const open = comments.filter((c) => !c.resolved)
  const lines: string[] = []
  lines.push('AI FEEDBACK LOOP — REVISION REQUEST')
  lines.push('')
  lines.push(
    'This HTML was reviewed and has feedback to apply. Make ALL of the changes',
  )
  lines.push(
    'listed below to the markup, then return the COMPLETE, updated HTML file.',
  )
  lines.push('Keep everything else unchanged.')
  lines.push('')
  lines.push(
    'Each item points to one element by CSS selector (and id), with a snippet of',
  )
  lines.push('its current text to help you locate it.')
  lines.push('')

  if (open.length === 0) {
    lines.push('(No open feedback.)')
  } else {
    lines.push(`OPEN FEEDBACK (${open.length}):`)
    lines.push('')
    open.forEach((c, i) => {
      lines.push(`${i + 1}. Element:  ${c.anchor.label}   (selector: ${c.anchor.selector})`)
      if (c.anchor.quote) lines.push(`   Current:  "${c.anchor.quote}"`)
      lines.push(`   Change:   ${c.body}   — ${c.author}`)
      lines.push('')
    })
  }
  lines.push('— end of feedback —')
  return lines.join('\n')
}

/** Full exportable HTML: original markup + a top re-prompt + a JSON snapshot. */
export function buildExportHtml(html: string, comments: Comment[], fileName: string): string {
  const reprompt = buildReprompt(comments).replace(/--+>/g, '-- >') // don't close the comment early

  const topBlock = `<!-- ${MARKER_START} (${fileName})\n\n${reprompt}\n\n${MARKER_END} -->`

  const snapshot = {
    generator: 'ai-feedback-loop',
    file: fileName,
    exportedAt: new Date().toISOString(),
    comments,
  }
  const json = JSON.stringify(snapshot, null, 2).replace(/</g, '\\u003c')
  const jsonBlock = `<script type="application/json" id="aifl-comments">\n${json}\n</script>`

  // Put the instructions where a top-down reader sees them first.
  let out = html
  if (/<head[^>]*>/i.test(out)) out = out.replace(/(<head[^>]*>)/i, `$1\n${topBlock}`)
  else if (/<html[^>]*>/i.test(out)) out = out.replace(/(<html[^>]*>)/i, `$1\n${topBlock}`)
  else out = `${topBlock}\n${out}`

  // Snapshot at the bottom (data, not instructions).
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${jsonBlock}\n</body>`)
  else out = `${out}\n${jsonBlock}\n`

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

/** Copy the re-prompt instructions to the clipboard (paste into any AI agent). */
export async function copyReprompt(comments: Comment[]): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildReprompt(comments))
    return true
  } catch {
    return false
  }
}
