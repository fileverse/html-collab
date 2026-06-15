/*
 * AIFL preview agent — injected into the sandboxed iframe (allow-scripts, NOT
 * allow-same-origin). It cannot reach the parent app's DOM/storage; it only
 * talks to the host via postMessage. Plain ES5-ish JS on purpose: it runs
 * inside arbitrary user HTML, so it must be self-contained and defensive.
 */
;(function () {
  'use strict'

  var HOST = 'aifl-host'
  var SELF = 'aifl-agent'

  var mode = 'view' // 'view' | 'comment'
  var tracked = [] // [{ id, selector, elementId, quote }]
  var lastX = 0
  var lastY = 0
  var lastMod = false // ⌘/Ctrl held — inverts the current mode for one action
  var hoverActive = false // whether a hover ring is currently shown on the host
  var hoverPending = false
  var reportPending = false

  function post(msg) {
    msg.source = SELF
    try {
      parent.postMessage(msg, '*')
    } catch (e) {
      /* ignore */
    }
  }

  function clamp01(n) {
    return n < 0 ? 0 : n > 1 ? 1 : n
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s)
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&')
  }

  function labelFor(el) {
    var tag = el.tagName.toLowerCase()
    if (el.id) return tag + '#' + el.id
    var cls = ''
    if (el.className && typeof el.className === 'string') {
      cls = el.className.trim().split(/\s+/)[0] || ''
    }
    return cls ? tag + '.' + cls : tag
  }

  // Build a querySelector path from the document root up. Stops at the nearest
  // ancestor with an id (most stable) or at <body>.
  function selectorFor(el) {
    if (el.id) return '#' + cssEscape(el.id)
    var parts = []
    var node = el
    while (node && node.nodeType === 1) {
      if (node === document.body) {
        parts.unshift('body')
        break
      }
      if (node === document.documentElement) break
      if (node.id) {
        parts.unshift('#' + cssEscape(node.id))
        break
      }
      var parent = node.parentElement
      if (!parent) {
        parts.unshift(node.tagName.toLowerCase())
        break
      }
      var tag = node.tagName.toLowerCase()
      var same = []
      for (var i = 0; i < parent.children.length; i++) {
        if (parent.children[i].tagName === node.tagName) same.push(parent.children[i])
      }
      if (same.length > 1) {
        parts.unshift(tag + ':nth-of-type(' + (same.indexOf(node) + 1) + ')')
      } else {
        parts.unshift(tag)
      }
      node = parent
    }
    return parts.join(' > ')
  }

  function anchorFor(el) {
    return {
      selector: selectorFor(el),
      elementId: el.id || null,
      quote: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140),
      label: labelFor(el),
    }
  }

  function rectOf(el) {
    var r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }

  // Resolve a tracked anchor back to a live element: id -> selector -> quote.
  function resolve(a) {
    if (a.elementId) {
      var byId = document.getElementById(a.elementId)
      if (byId) return byId
    }
    if (a.selector) {
      try {
        var bySel = document.querySelector(a.selector)
        if (bySel) return bySel
      } catch (e) {
        /* invalid selector — fall through */
      }
    }
    if (a.quote && document.body) {
      var all = document.body.querySelectorAll('*')
      for (var i = 0; i < all.length; i++) {
        var txt = (all[i].textContent || '').replace(/\s+/g, ' ').trim()
        if (txt && txt.indexOf(a.quote) === 0 && txt.length < a.quote.length + 80) {
          return all[i]
        }
      }
    }
    return null
  }

  function targetAt(x, y) {
    var el = document.elementFromPoint(x, y)
    if (!el || el === document.documentElement) return null
    // `body` IS allowed: pages that are just text (no wrapping elements) have
    // their text directly under <body>, so excluding it would make those pages
    // uncommentable. Callers refine the body case via textRectAt().
    return el
  }

  // Tight rect of the text run under a point — used so commenting on bare body
  // text highlights just that text, not the whole page. Returns null over
  // genuinely empty space (so normal pages' margins stay un-highlighted).
  function textRectAt(x, y) {
    var range = null
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y)
    } else if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y)
      if (pos) {
        range = document.createRange()
        range.setStart(pos.offsetNode, pos.offset)
        range.collapse(true)
      }
    }
    if (!range) return null
    var node = range.startContainer
    if (!node || node.nodeType !== 3 || !(node.textContent || '').trim()) return null
    try {
      var rng = document.createRange()
      rng.selectNodeContents(node)
      var r = rng.getBoundingClientRect()
      if (r && r.width && r.height) return { x: r.left, y: r.top, w: r.width, h: r.height }
    } catch (e) {
      /* ignore */
    }
    return null
  }

  function reportRects() {
    var out = []
    for (var i = 0; i < tracked.length; i++) {
      var el = resolve(tracked[i])
      var rect = null
      if (el) {
        var r = rectOf(el)
        // Hidden elements (an off-screen state in an interactive page, a
        // display:none tab) measure 0×0 — report null so the pin doesn't pile
        // up at the canvas origin. It reappears when the page returns to that
        // state and the element is laid out again.
        if (r.w > 0 || r.h > 0) rect = r
      }
      out.push({ id: tracked[i].id, rect: rect })
    }
    post({ type: 'rects', rects: out })
  }

  function scheduleReport() {
    if (reportPending) return
    reportPending = true
    requestAnimationFrame(function () {
      reportPending = false
      reportRects()
    })
  }

  // Report the document's natural content width so the host can decide whether
  // to scale a wide (fixed-layout) page down, or show a responsive one 1:1.
  function reportSize() {
    try {
      var de = document.documentElement
      var w = Math.max(
        de ? de.scrollWidth : 0,
        document.body ? document.body.scrollWidth : 0,
      )
      post({ type: 'size', contentWidth: w })
    } catch (e) {
      /* ignore */
    }
  }

  // Re-report a few times after a (re)track so pins settle once late-loading
  // fonts/images finish reflowing the page — not just on the first frame.
  function reportSettling() {
    scheduleReport()
    reportSize()
    setTimeout(function () {
      scheduleReport()
      reportSize()
    }, 120)
    setTimeout(scheduleReport, 400)
    setTimeout(function () {
      scheduleReport()
      reportSize()
    }, 1000)
  }

  // Whether *this* action should place a comment: the toggle's mode, inverted
  // while ⌘/Ctrl is held. So you can comment without leaving Browse (and click
  // through without leaving Comment) — a one-off shortcut on top of the toggle.
  function commenting(mod) {
    return (mode === 'comment') !== !!mod
  }

  function refreshCursor() {
    if (document.body) document.body.style.cursor = commenting(lastMod) ? 'crosshair' : ''
  }

  function setMode(m) {
    mode = m
    refreshCursor()
    updateHover()
  }

  // ---- input ----------------------------------------------------------------

  function updateHover() {
    if (hoverPending) return
    hoverPending = true
    requestAnimationFrame(function () {
      hoverPending = false
      refreshCursor()
      var rect = null
      var label = null
      if (commenting(lastMod)) {
        var el = targetAt(lastX, lastY)
        if (el === document.body) {
          var tr = textRectAt(lastX, lastY) // only over real text, not empty margins
          if (tr) {
            rect = tr
            label = 'text'
          }
        } else if (el) {
          rect = rectOf(el)
          label = labelFor(el)
        }
      }
      if (rect) {
        post({ type: 'hover', rect: rect, label: label })
        hoverActive = true
      } else if (hoverActive) {
        post({ type: 'hover', rect: null, label: null })
        hoverActive = false
      }
    })
  }

  document.addEventListener(
    'mousemove',
    function (e) {
      lastX = e.clientX
      lastY = e.clientY
      lastMod = e.metaKey || e.ctrlKey
      updateHover()
    },
    true,
  )

  // Holding/releasing ⌘/Ctrl flips the affordance even without moving the mouse.
  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key === 'Meta' || e.key === 'Control') {
        lastMod = true
        updateHover()
      }
    },
    true,
  )
  document.addEventListener(
    'keyup',
    function (e) {
      if (e.key === 'Meta' || e.key === 'Control') {
        lastMod = false
        updateHover()
      }
    },
    true,
  )

  document.addEventListener(
    'click',
    function (e) {
      if (!commenting(e.metaKey || e.ctrlKey)) {
        // Interacting (Browse, or Comment + ⌘/Ctrl). This preview is a srcdoc
        // iframe with no base URL, so a plain link (<a href="#">, a relative
        // path) would navigate the frame to a blank page. Neutralize that:
        // in-page/relative links do nothing, external links open in a new tab.
        // The page's own onclick handlers still run (we don't stop propagation),
        // so SPA navigation keeps working.
        var link = e.target && e.target.closest ? e.target.closest('a[href]') : null
        if (link) {
          var raw = (link.getAttribute('href') || '').trim()
          if (raw.slice(0, 11).toLowerCase() !== 'javascript:') {
            e.preventDefault()
            if (/^(https?:)?\/\//i.test(raw) || /^(mailto:|tel:)/i.test(raw)) {
              try {
                window.open(link.href, '_blank', 'noopener,noreferrer')
              } catch (e2) {
                /* popups blocked — better than blanking the preview */
              }
            }
          }
        }
        return
      }
      var el = targetAt(e.clientX, e.clientY)
      if (!el) return
      // on bare <body>, only anchor where there's real text (skip empty space)
      if (el === document.body && !textRectAt(e.clientX, e.clientY)) return
      e.preventDefault()
      e.stopPropagation()
      var r = el.getBoundingClientRect()
      var ox = r.width ? (e.clientX - r.left) / r.width : 0.5
      var oy = r.height ? (e.clientY - r.top) / r.height : 0
      post({
        type: 'pick',
        anchor: anchorFor(el),
        rect: rectOf(el),
        offset: { x: clamp01(ox), y: clamp01(oy) },
      })
    },
    true,
  )

  window.addEventListener('scroll', scheduleReport, true)
  window.addEventListener('resize', function () {
    scheduleReport()
    reportSize()
  })
  window.addEventListener('load', reportSettling)
  if (window.ResizeObserver) {
    try {
      new ResizeObserver(scheduleReport).observe(document.documentElement)
    } catch (e) {
      /* ignore */
    }
  }

  // Re-measure when the page mutates itself — an SPA swapping "pages" via
  // display/class toggles, lazy content, an element that appears after a click.
  // Without this a pin left on a child screen wouldn't reappear when the page
  // navigates back to it. Debounced so animation-heavy pages don't report
  // every frame.
  var mutTimer = null
  function scheduleReportSoon() {
    if (mutTimer) return
    mutTimer = setTimeout(function () {
      mutTimer = null
      reportRects()
    }, 200)
  }
  if (window.MutationObserver && document.documentElement) {
    try {
      new MutationObserver(scheduleReportSoon).observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden'],
      })
    } catch (e) {
      /* ignore */
    }
  }

  // ---- host messages ---------------------------------------------------------

  window.addEventListener('message', function (e) {
    var d = e.data
    if (!d || d.source !== HOST) return
    if (d.type === 'init' || d.type === 'setMode') {
      setMode(d.mode)
    } else if (d.type === 'track') {
      tracked = d.anchors || []
      reportSettling()
    } else if (d.type === 'focus') {
      var el = d.anchor && resolve(d.anchor)
      if (el && el.scrollIntoView) {
        try {
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' })
        } catch (err) {
          el.scrollIntoView()
        }
        scheduleReport()
      }
    }
  })

  function ready() {
    post({ type: 'ready' })
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready)
  } else {
    ready()
  }
})()
