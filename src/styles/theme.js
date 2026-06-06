// Central design tokens — all UI colors and common style objects
// Import as: import { T, CARD, SEL, BTN } from '../styles/theme.js'

export const T = {
  // ── Backgrounds (dark grey, no blue tint) ──────────────────────────────
  bg:       '#111111',   // page background
  bgDeep:   '#0c0c0c',   // deepest (table headers, navbar)
  surf:     '#191919',   // card / panel surface
  surf2:    '#222222',   // input, stat chip, inner card
  surf3:    '#161616',   // slightly darker card variant

  // ── Borders ────────────────────────────────────────────────────────────
  border:   '#2c2c2c',
  borderMd: '#383838',

  // ── Text ───────────────────────────────────────────────────────────────
  text:     '#ebebeb',   // primary
  textMd:   '#a3a3a3',   // secondary
  textLow:  '#737373',   // muted / labels
  textMin:  '#4a4a4a',   // minimum / very muted

  // ── Accent (indigo family — keeps brand identity) ──────────────────────
  accent:    '#6366f1',
  accentLt:  '#818cf8',
  accentSoft:'#a5b4fc',

  // ── Status ─────────────────────────────────────────────────────────────
  green:    '#10b981',
  greenBg:  '#10b98120',
  red:      '#ef4444',
  redBg:    '#ef444420',
  amber:    '#f59e0b',
  amberBg:  '#f59e0b20',
  blue:     '#3b82f6',
  blueBg:   '#3b82f620',
  purple:   '#a78bfa',
  purpleBg: '#a78bfa20',
  cyan:     '#22d3ee',

  // ── Semantic comparison colors ─────────────────────────────────────────
  // Used for "this side wins / loses / neutral" in head-to-head displays so
  // edge meaning is consistent app-wide and never carried by team color alone.
  edge:     '#10b981',   // the winning side of a compared stat
  edgeBg:   '#10b98118',
  fade:     '#737373',   // the losing / non-winning side (de-emphasised)
}

// ── Spacing scale (px) ──────────────────────────────────────────────────────
// One ladder of spacing values so padding/margins/gaps stay on a consistent
// rhythm instead of ad-hoc 6/7/8/14/16/18/20/22/24 mixes.
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 }

// ── Type scale ──────────────────────────────────────────────────────────────
// Named roles map to a small set of sizes/weights. Use these for headings and
// labels so the same role looks identical on every page.
export const TYPE = {
  pageTitle:    { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: '#a5b4fc', letterSpacing: '0.01em' },
  kpiValue:     { fontSize: 20, fontWeight: 700, lineHeight: 1.1 },
  cardTitle:    { fontSize: 15, fontWeight: 700 },
  label:        { fontSize: 11, fontWeight: 600, color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.05em' },
  body:         { fontSize: 13, color: '#c8c8c8', lineHeight: 1.6 },
  mono:         { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontVariantNumeric: 'tabular-nums' },
}

// ── Reusable style objects ──────────────────────────────────────────────────

export const CARD = {
  background:   T.surf,
  border:       `1px solid ${T.border}`,
  borderRadius: 12,
  padding:      '20px 24px',
}

export const CARD_SM = {
  background:   T.surf,
  border:       `1px solid ${T.border}`,
  borderRadius: 10,
  padding:      '14px 16px',
}

export const SEL = {
  background:   T.surf2,
  border:       `1px solid ${T.border}`,
  color:        T.text,
  borderRadius: 6,
  padding:      '6px 10px',
  fontSize:     13,
  outline:      'none',
}

export const BTN = (active, color = T.accent) => ({
  padding:      '5px 12px',
  borderRadius: 6,
  fontSize:     12,
  fontWeight:   500,
  cursor:       'pointer',
  border:       'none',
  background:   active ? color : T.surf2,
  color:        active ? '#fff' : T.textMd,
  transition:   'all .15s',
})

export const SECTION_TITLE = {
  fontSize:   13,
  fontWeight: 600,
  color:      T.accentSoft,
  marginBottom: 12,
}

export const STAT_CHIP = {
  background:   T.surf2,
  borderRadius: 8,
  padding:      '8px 12px',
  textAlign:    'center',
}

// Accessible tab button. Pair with role="tab" + aria-selected on the element.
// `active` drives the selected styling; the underline doubles as a non-color
// cue so selection isn't communicated by color alone.
export const TAB = (active) => ({
  appearance:   'none',
  padding:      '7px 14px',
  borderRadius: 7,
  fontSize:     13,
  fontWeight:   active ? 600 : 500,
  cursor:       'pointer',
  border:       'none',
  background:   active ? `${T.accent}1f` : 'transparent',
  color:        active ? T.accentSoft : T.textMd,
  boxShadow:    active ? `inset 0 -2px 0 ${T.accentLt}` : 'none',
  transition:   'background .15s, color .15s',
  whiteSpace:   'nowrap',
})
