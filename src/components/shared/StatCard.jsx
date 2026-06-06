import { T } from '../../styles/theme.js'

// StatCard — a single head-to-head metric (A vs B). The winning side stays at
// full weight with a small ▲ marker; the trailing side is dimmed. Both the
// dimming and the marker are non-color cues, so the "who leads" signal does not
// rely on color alone (accessibility). An aria-label summarises the row for
// screen readers.
export default function StatCard({ label, valueA, valueB, colorA, colorB, higherBetter, fmt }) {
  // Null-safe formatter: the per-metric `fmt` callbacks assume a real number
  // (they call v.toFixed), so guard missing values here rather than crashing
  // the whole page when a team-season has no data for this metric.
  const fmtFn = (v) => (v == null ? '—' : fmt ? fmt(v) : (v?.toFixed?.(1) ?? String(v)))
  const strA = fmtFn(valueA)
  const strB = fmtFn(valueB)

  let winA = null
  if (higherBetter !== null && valueA != null && valueB != null && valueA !== valueB) {
    winA = higherBetter ? valueA > valueB : valueA < valueB
  }

  const ariaLabel = `${label}: ${strA} versus ${strB}` +
    (winA === null ? '' : winA ? ', first leads' : ', second leads')

  const side = (str, color, isWinner, isLoser) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      {isWinner && <span aria-hidden="true" style={{ fontSize: 10, color }}>▲</span>}
      <span style={{
        fontSize: 22, fontWeight: 700, color,
        opacity: isLoser ? 0.5 : 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{str}</span>
    </span>
  )

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        background: T.surf2, borderRadius: 10, padding: '12px 16px',
        border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ fontSize: 11, color: T.textLow, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {side(strA, colorA, winA === true, winA === false)}
        <span aria-hidden="true" style={{ fontSize: 11, color: T.textMin }}>vs</span>
        {side(strB, colorB, winA === false, winA === true)}
      </div>
    </div>
  )
}
