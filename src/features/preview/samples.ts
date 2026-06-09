/**
 * Sample documents for trying the tool without importing a file.
 *
 * Self-contained, fully static, scrollable web pages (inline CSS, no JS) so they
 * render perfectly inside the sandboxed preview and are ideal for click-to-
 * comment. The files live in /public/templates and are fetched on demand, so
 * they stay out of the JS bundle.
 */
export type Sample = { id: string; name: string }

export const SAMPLES: Sample[] = [
  { id: 'product-landing', name: 'Product landing' },
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'article', name: 'Article' },
  { id: 'pricing', name: 'Pricing' },
]

/** A nice file name for a sample, used as the doc id / share name. */
export function sampleFileName(id: string): string {
  return `${id}.html`
}

/** Fetch a sample's HTML from /public/templates. */
export async function loadSampleHtml(id: string): Promise<string> {
  const res = await fetch(`${import.meta.env.BASE_URL}templates/${id}.html`)
  if (!res.ok) throw new Error(`Sample "${id}" not found`)
  return res.text()
}
