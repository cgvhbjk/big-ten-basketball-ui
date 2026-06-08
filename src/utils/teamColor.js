// Team-color legibility helpers.
//
// Several Big Ten brand colors (Michigan navy, Oregon/Michigan St green,
// Indiana/Minnesota dark red, Northwestern/Washington purple, Penn St navy,
// USC cardinal) are very dark and nearly vanish as chart marks or colored text
// on the app's near-black background (#0e0e0e / #111). The fix keeps each
// team's REAL color as the fill and adds a thin light outline when the color is
// too dark to read on its own — a white SVG stroke for chart marks, a light
// text-shadow halo for colored text. One luminance check drives all of it, so
// the rule is defined once and reused everywhere.

import { SCHOOL_COLORS } from '../data/constants.js'

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// sRGB channel → linear-light, per the WCAG 2.x definition.
function toLinear(c) {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

// WCAG relative luminance in [0, 1]. Invalid input → 1 (treated as "light", so
// it never triggers an outline by accident).
export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 1
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b)
}

// Below this luminance a color reads as "dark on dark" and needs an outline.
// Calibrated against the 18 brand colors: it flags the genuinely dark hues
// (Michigan, Washington, Minnesota, Michigan St, Northwestern, Oregon, Penn St,
// Indiana, USC) while leaving the bright reds/oranges/golds/blues untouched.
export const DARK_THRESHOLD = 0.10

export function isDarkColor(hex) {
  return relativeLuminance(hex) < DARK_THRESHOLD
}

// Per-team display-color overrides. Outlines are the primary fix; add an entry
// here ONLY when a team still reads badly with the outline. Keep the override
// faithful to brand (a lifted shade of the same hue). Applied to chart marks,
// lines and colored text via resolveTeamColor — team BADGES keep the true brand
// color (solid fill with auto-contrasting label, so they're legible already).
export const ALT_COLORS = {
  // Michigan navy (#00274C, luminance ~0.02) is the single darkest brand color;
  // even with a halo it sits low, so we display a slightly lifted navy.
  michigan: '#274C77',
}

// The color to actually paint for a team (override if present, else brand).
export function resolveTeamColor(school, fallback = '#6366f1') {
  return ALT_COLORS[school] ?? SCHOOL_COLORS[school] ?? fallback
}

// SVG stroke for a chart mark (e.g. a scatter dot) filled with `hex`. Dark
// fills get a light ring so they separate from the background; light fills keep
// the subtle near-black ring that separates them from each other and the grid.
export function markStroke(hex) {
  return isDarkColor(hex)
    ? { stroke: '#e8e8e8', strokeWidth: 1.5 }
    : { stroke: '#0e0e0e', strokeWidth: 1 }
}

// Recharts <Radar dot={…}> config: outlined vertices for dark teams so a faint
// polygon line is still locatable; `false` (no dots) for light teams, matching
// the existing look.
export function radarDot(hex) {
  return isDarkColor(hex)
    ? { r: 3, fill: hex, stroke: '#fff', strokeWidth: 1 }
    : false
}

// CSS text-shadow halo for colored text. A thin light outline around dark
// glyphs keeps them readable on the dark background; light colors get none.
export function textHaloShadow(hex) {
  if (!isDarkColor(hex)) return 'none'
  return '-0.5px -0.5px 0 #e8e8e8, 0.5px -0.5px 0 #e8e8e8, -0.5px 0.5px 0 #e8e8e8, 0.5px 0.5px 0 #e8e8e8'
}
