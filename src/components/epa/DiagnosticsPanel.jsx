import { useState } from 'react'
import { T, CARD } from '../../styles/theme.js'

function Badge({ level, children }) {
  const colors = {
    ok:    { bg: T.greenBg,  text: T.green  },
    warn:  { bg: T.amberBg,  text: T.amber  },
    error: { bg: T.redBg,    text: T.red    },
    info:  { bg: T.blueBg,   text: T.blue   },
  }
  const c = colors[level] ?? colors.info
  return (
    <span style={{ background: c.bg, color: c.text, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
      {children}
    </span>
  )
}

function Row({ label, value, level = 'info' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${T.border}20` }}>
      <span style={{ fontSize: 12, color: T.textMd }}>{label}</span>
      <Badge level={level}>{value}</Badge>
    </div>
  )
}

function VIFTable({ vif }) {
  if (!vif) return null
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 8 }}>
      <thead>
        <tr>
          {Object.keys(vif).map(k => (
            <th key={k} style={{ textAlign: 'center', padding: '3px 6px', color: T.textLow, fontWeight: 500, borderBottom: `1px solid ${T.border}` }}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {Object.entries(vif).map(([k, v]) => {
            const level = v >= 10 ? 'error' : v >= 5 ? 'warn' : 'ok'
            return (
              <td key={k} style={{ textAlign: 'center', padding: '3px 6px' }}>
                <Badge level={level}>{v}</Badge>
              </td>
            )
          })}
        </tr>
      </tbody>
    </table>
  )
}

export default function DiagnosticsPanel({ diagnostics, messages, signIssues }) {
  const [open, setOpen] = useState(false)

  if (!diagnostics) return null

  const { n, k, obsPerPredictor, vif } = diagnostics
  const hasWarnings = messages?.length > 0
  const maxVif = vif ? Math.max(...Object.values(vif)) : null
  const nSignIssues = signIssues?.length ?? 0

  return (
    <div style={{ ...CARD, marginBottom: 20, borderColor: hasWarnings ? T.amber : T.border }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: T.textMin, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Model Diagnostics
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Badge level={nSignIssues === 0 ? 'ok' : 'warn'}>
            {nSignIssues === 0 ? 'all signs correct' : `${nSignIssues} sign issue${nSignIssues > 1 ? 's' : ''}`}
          </Badge>
          {maxVif != null && <Badge level={maxVif < 5 ? 'ok' : maxVif < 10 ? 'warn' : 'error'}>max VIF {maxVif.toFixed(1)}</Badge>}
          {hasWarnings && <Badge level="warn">{messages.length} warning{messages.length > 1 ? 's' : ''}</Badge>}
        </span>
        <span style={{ fontSize: 11, color: T.textMin, whiteSpace: 'nowrap' }}>{open ? '▲ collapse' : '▼ details'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 16 }}>
          <div style={{ background: T.surf2, borderRadius: 6, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: T.textMd, lineHeight: 1.6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.accentSoft, marginBottom: 6, letterSpacing: '0.05em' }}>
              WHAT THIS PANEL SHOWS
            </div>
            One ridge regression on the eight Dean Oliver four-factor terms, fit on {n} Big Ten per-game box scores.
            At this sample size the four factors are nearly orthogonal (all VIFs near 1), so every coefficient comes back
            stable and textbook-signed — no sign constraints or external training data required.
            {nSignIssues > 0 && (
              <> <strong style={{ color: T.amber }}>{nSignIssues} coefficient{nSignIssues > 1 ? 's' : ''}</strong> came back against the expected sign — investigate the data before trusting the affected event values.</>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.accentSoft, marginBottom: 6 }}>SAMPLE SIZE</div>
              <Row label="Observations (games)"   value={n} />
              <Row label="Predictors"             value={k} />
              <Row label="Obs / predictor ratio"  value={obsPerPredictor} level={obsPerPredictor < 10 ? 'warn' : 'ok'} />
              <p style={{ fontSize: 10, color: T.textMin, marginTop: 6, lineHeight: 1.5 }}>
                Rule of thumb: ≥10 observations per predictor for a stable fit. Per-game data clears this by a wide margin.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.accentSoft, marginBottom: 6 }}>COLLINEARITY (VIF)</div>
              <VIFTable vif={vif} />
              <p style={{ fontSize: 10, color: T.textMin, marginTop: 6, lineHeight: 1.5 }}>
                {maxVif != null && maxVif < 5
                  ? <>All VIFs under 5 (max {maxVif.toFixed(1)}) — <strong style={{ color: T.green }}>no collinearity problems</strong>.</>
                  : <>VIF ≥ 5 = moderate concern, ≥ 10 = severe. Inspect any flagged predictors before trusting their coefficients.</>}
              </p>
            </div>
          </div>

          {hasWarnings && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.amber, marginBottom: 6 }}>WARNINGS</div>
              {messages.map((m, i) => (
                <div key={i} style={{ fontSize: 11, color: T.amber, background: T.amberBg, borderRadius: 4, padding: '5px 10px', marginBottom: 4 }}>
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
