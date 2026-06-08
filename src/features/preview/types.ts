/** A stable reference to an element inside the previewed HTML. */
export type Anchor = {
  /** querySelector path from the document root (nth-of-type based). */
  selector: string
  /** id of the target element, if it has one (most stable). */
  elementId: string | null
  /** trimmed textContent snapshot — last-resort fallback if selector breaks. */
  quote: string
  /** human label for the drawer, e.g. "h1#headline" / "a" / "section.hero". */
  label: string
}

/** Rectangle in the iframe's own viewport coordinates. */
export type Rect = { x: number; y: number; w: number; h: number }

/** A placed feedback mark (a pin). Minimal shape for the M2 spike. */
export type Mark = {
  id: string
  anchor: Anchor
  /** normalized point within the element (0..1) where the pin sits. */
  offset: { x: number; y: number }
}

export type PreviewMode = 'view' | 'comment'

/** iframe (agent) -> host (parent) */
export type AgentMessage =
  | { source: 'aifl-agent'; type: 'ready' }
  | { source: 'aifl-agent'; type: 'hover'; rect: Rect | null; label: string | null }
  | {
      source: 'aifl-agent'
      type: 'pick'
      anchor: Anchor
      rect: Rect
      offset: { x: number; y: number }
    }
  | { source: 'aifl-agent'; type: 'rects'; rects: Array<{ id: string; rect: Rect | null }> }

/** host (parent) -> iframe (agent) */
export type HostMessage =
  | { source: 'aifl-host'; type: 'init'; mode: PreviewMode }
  | { source: 'aifl-host'; type: 'setMode'; mode: PreviewMode }
  | { source: 'aifl-host'; type: 'track'; anchors: Array<{ id: string } & Anchor> }
  | { source: 'aifl-host'; type: 'focus'; anchor: Anchor }
