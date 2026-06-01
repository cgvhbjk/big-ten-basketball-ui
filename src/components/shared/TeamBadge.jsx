import { SCHOOL_META } from '../../data/constants.js'

// Pick readable badge text (dark/white) for a hex background via relative
// luminance. With 18 Big Ten colors a few run light (e.g. Iowa gold), so a
// fixed white would be illegible — this flips those to dark text.
function textOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#1a1a1a' : '#fff'
}

export default function TeamBadge({ school, size = 'md', showName = true }) {
  const meta = SCHOOL_META[school] ?? { abbr: school.slice(0, 3).toUpperCase(), fullName: school, color: '#888' }
  const sz = size === 'sm' ? 28 : size === 'lg' ? 48 : 36

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: sz, height: sz, borderRadius: '50%',
        background: meta.color, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: sz * 0.32, fontWeight: 700, color: textOn(meta.color),
        flexShrink: 0,
      }}>
        {meta.abbr}
      </span>
      {showName && (
        <span style={{ fontSize: size === 'sm' ? 12 : 14, color: '#ebebeb', fontWeight: 500 }}>
          {meta.fullName}
        </span>
      )}
    </span>
  )
}
