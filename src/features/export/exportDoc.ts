import type { Comment } from '@/store/useCommentStore'

/**
 * M7 export — bake collected feedback back into the HTML file so it travels
 * with the document and is "ready to re-prompt":
 *
 *  1. a human/AI-readable re-prompt block (HTML comment) listing each open
 *     ask against its element (label · selector · quote),
 *  2. a machine-readable <script type="application/json"> snapshot so the file
 *     can be re-imported with its comments intact.
 *
 * The original markup is left untouched; everything is appended before </body>.
 */

const MARKER_START = 'AI-FEEDBACK-LOOP:BEGIN'
const MARKER_END = 'AI-FEEDBACK-LOOP:END'

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function stamp(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Re-prompt instructions for the open (unresolved) comments. */
export function buildReprompt(comments: Comment[]): string {
  const open = comments.filter((c) => !c.resolved)
  const lines: string[] = []
  lines.push('Apply the following feedback to this HTML and return the updated file.')
  lines.push('Each item targets one element by CSS selector / id, with a text snippet for disambiguation.')
  lines.push('')

  if (open.length === 0) {
    lines.push('(No open comments.)')
  } else {
    open.forEach((c, i) => {
      lines.push(`${i + 1}. [${c.anchor.label}]  selector: ${c.anchor.selector}`)
      if (c.anchor.quote) lines.push(`   text: "${c.anchor.quote}"`)
      lines.push(`   feedback (${c.author}): ${c.body}`)
      lines.push('')
    })
  }
  return lines.join('\n')
}

/** Full exportable HTML: original markup + baked-in feedback block. */
export function buildExportHtml(html: string, comments: Comment[], fileName: string): string {
  const reprompt = buildReprompt(comments)
    // never let user content close the surrounding HTML comment early
    .replace(/--+>/g, '-- >')

  const snapshot = {
    generator: 'ai-feedback-loop',
    file: fileName,
    exportedAt: new Date().toISOString(),
    comments,
  }
  const json = JSON.stringify(snapshot, null, 2).replace(/</g, '\\u003c')

  const block = [
    `<!-- ${MARKER_START}`,
    `Generated ${stamp()} · ${fileName}`,
    '',
    reprompt,
    `${MARKER_END} -->`,
    `<script type="application/json" id="aifl-comments">`,
    json,
    `</script>`,
  ].join('\n')

  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${block}\n</body>`)
  if (/<\/html>/i.test(html)) return html.replace(/<\/html>/i, `${block}\n</html>`)
  return `${html}\n${block}\n`
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
  // give the browser a tick to start the download before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
