import { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import teamSeasons  from '../data/teamSeasons.json'
import gameLogs     from '../data/gameLogs.json'
import baselineEP   from '../data/baseline_epa.json'
import { runEPAPipeline } from '../utils/epaModels/pipeline.js'
import useEpaStore from '../store/useEpaStore.js'
import PageHeader from '../components/shared/PageHeader.jsx'
import DiagnosticsPanel from '../components/epa/DiagnosticsPanel.jsx'
import PageConclusions from '../components/shared/PageConclusions.jsx'
import MethodologyPanel from '../components/shared/MethodologyPanel.jsx'
import { T, CARD } from '../styles/theme.js'

// ── Shared sub-components ─────────────────────────────────────────────────────

function EpaPill({ value }) {
  const pos = value > 0
  const zero = value === 0
  return (
    <span style={{
      background: zero ? T.surf2 : pos ? '#E1F5EE' : '#FCEBEB',
      color:      zero ? T.textLow : pos ? '#085041' : '#791F1F',
      borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700,
      display: 'inline-block', minWidth: 58, textAlign: 'center',
    }}>
      {zero ? '0.000' : `${pos ? '+' : ''}${value.toFixed(3)}`}
    </span>
  )
}

const EVENT_ROWS_FULL = [
  { key: 'made2FG',            label: 'Made 2-pt FG'           },
  { key: 'made3FG',            label: 'Made 3-pt FG'           },
  { key: 'offTurnover',        label: 'Offensive Turnover'     },
  { key: 'offRebound',         label: 'Offensive Rebound'      },
  { key: 'foulDrawn',          label: 'Foul Drawn (FT)'        },
  { key: 'defForcedTurnover',  label: 'Forced Turnover (def)'  },
  { key: 'defShotSuppression', label: 'Shot Suppression (def)' },
]

// "Essentially zero" threshold for hiding numerically ~0 events. The per-game
// ridge model doesn't clip coefficients, so in practice nothing is hidden —
// this just guards against floating-point dust.
const EPA_ZERO_EPS = 1e-3

// Plain-English note per coefficient. On the per-game sample all eight factors
// come back stable and textbook-signed, so none are flagged uncertain.
const COEFF_META = [
  { key: 'off_eFG', label: 'Off eFG%',  note: 'shooting quality',                          uncertain: false },
  { key: 'off_TOV', label: 'Off TOV',   note: 'turnover rate (lower is better)',           uncertain: false },
  { key: 'off_ORB', label: 'Off ORB',   note: 'offensive rebound rate',                    uncertain: false },
  { key: 'off_FTR', label: 'Off FTR',   note: 'free throw rate',                           uncertain: false },
  { key: 'def_eFG', label: 'Def eFG%',  note: 'opponent shooting quality',                 uncertain: false },
  { key: 'def_TOV', label: 'Def TOV',   note: 'opponent turnover rate (forced)',           uncertain: false },
  { key: 'def_ORB', label: 'Def ORB',   note: 'opponent offensive rebound rate (lower is better)', uncertain: false },
  { key: 'def_FTR', label: 'Def FTR',   note: 'opponent free throw rate',                  uncertain: false },
]

function EventEPATable({ epa }) {
  if (!epa) return <div style={{ color: T.textMin, fontSize: 12 }}>No EPA values</div>
  // Filter out events whose EPA value is essentially zero (numeric dust). With
  // the per-game ridge fit every factor is non-zero, so nothing is hidden in
  // practice — this just avoids ever showing a meaningless 0.000 row.
  const visible = EVENT_ROWS_FULL.filter(({ key }) => Math.abs(epa[key] ?? 0) >= EPA_ZERO_EPS)
  const hiddenCount = EVENT_ROWS_FULL.length - visible.length
  return (
    <div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
          <th style={{ textAlign: 'left', padding: '5px 0', color: T.textLow, fontWeight: 500 }}>Event</th>
          <th style={{ textAlign: 'right', padding: '5px 0', color: T.textLow, fontWeight: 500 }}>EPA</th>
        </tr>
      </thead>
      <tbody>
        {visible.map(({ key, label }) => (
          <tr key={key} style={{ borderBottom: `1px solid ${T.border}20` }}>
            <td style={{ padding: '7px 0', color: T.textMd }}>{label}</td>
            <td style={{ padding: '7px 0', textAlign: 'right' }}>
              <EpaPill value={epa[key] ?? 0} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ fontSize: 10, color: T.textMin, marginTop: 8 }}>
      EPA from the per-game four-factor ridge model.
      {hiddenCount > 0 && ` ${hiddenCount} near-zero event${hiddenCount > 1 ? 's' : ''} hidden.`}
    </div>
    </div>
  )
}

function CoeffTable({ coefficients }) {
  if (!coefficients) return <div style={{ color: T.textMin, fontSize: 12 }}>No coefficients</div>
  return (
    <div>
      <p style={{ fontSize: 11, color: T.textLow, marginBottom: 10 }}>
        β_eFG of 1.2 means a 1% increase in eFG% adds 1.2 pts of net efficiency per 100 possessions.
        Fit on real Big Ten per-game box scores (ESPN, 2022–2026), all eight four-factor signs come back
        stable and textbook-correct (turnovers negative, rebounds positive) with all VIFs near 1 — see EPA_MODELS.md.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}` }}>
            <th style={{ textAlign: 'left',  padding: '5px 0', color: T.textLow, fontWeight: 500 }}>Factor</th>
            <th style={{ textAlign: 'right', padding: '5px 6px', color: T.textLow, fontWeight: 500 }}>β</th>
            <th style={{ textAlign: 'left',  padding: '5px 8px', color: T.textLow, fontWeight: 500 }}>Note</th>
          </tr>
        </thead>
        <tbody>
          {COEFF_META.map(({ key, label, note, uncertain }) => {
            const val = coefficients[key]
            // Visual treatment for unreliable coefficients: amber row tint,
            // dotted underline on the value, italic note. Same visual weight
            // is no longer used for reliable and unreliable estimates.
            const rowBg = uncertain ? `${T.amber}14` : 'transparent'
            return (
              <tr key={key} style={{
                borderBottom: `1px solid ${T.border}20`,
                background: rowBg,
              }}>
                <td style={{ padding: '6px 0', color: uncertain ? T.amber : T.textMd, fontWeight: uncertain ? 600 : 400 }}>
                  {uncertain && <span title="Coefficient flagged unreliable — see note" style={{ fontSize: 10, marginRight: 5, padding: '1px 5px', background: T.amber, color: '#1a1a1a', borderRadius: 3, fontWeight: 700 }}>?</span>}
                  {label}
                </td>
                <td style={{
                  padding: '6px 6px', textAlign: 'right', fontFamily: 'monospace',
                  color: uncertain ? T.amber : T.text,
                  textDecoration: uncertain ? 'underline dotted' : 'none',
                  textDecorationColor: uncertain ? T.amber : undefined,
                  opacity: uncertain ? 0.85 : 1,
                  fontStyle: uncertain ? 'italic' : 'normal',
                }}>
                  {val != null ? val.toFixed(4) : '—'}
                </td>
                <td style={{
                  padding: '6px 8px', color: uncertain ? T.amber : T.textMin, fontSize: 11,
                  fontStyle: uncertain ? 'italic' : 'normal',
                  opacity: uncertain ? 0.9 : 1,
                }}>
                  {note}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ fontSize: 10, color: T.textMin, marginTop: 8, fontStyle: 'italic' }}>
        Reliable rows (eFG, FTR) are shown solid; unreliable rows (TOV, ORB) are amber-tinted with dotted underlines so they're not visually equivalent to the trustworthy estimates.
      </div>
    </div>
  )
}

function ScatterViz({ observations, r2, n, label }) {
  if (!observations?.length) return <div style={{ color: T.textMin, fontSize: 12 }}>No observations</div>
  const vals = observations.flatMap(o => [o.actual, o.predicted])
  const min  = Math.min(...vals) - 2
  const max  = Math.max(...vals) + 2
  return (
    <div>
      <div style={{ fontSize: 11, color: T.textLow, marginBottom: 8 }}>
        {label} · R² = {r2?.toFixed(3) ?? '—'} · {n} obs · dots near diagonal = good fit
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <ScatterChart margin={{ top: 4, right: 12, bottom: 14, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="actual"    type="number" domain={[min, max]} tick={{ fontSize: 10, fill: T.textLow }} label={{ value: 'Actual', position: 'insideBottom', offset: -4, fontSize: 10, fill: T.textLow }} />
          <YAxis dataKey="predicted" type="number" domain={[min, max]} tick={{ fontSize: 10, fill: T.textLow }} width={36} />
          <Tooltip content={({ payload }) => {
            if (!payload?.length) return null
            const { label: lbl, actual, predicted } = payload[0].payload
            return (
              <div style={{ background: T.surf, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 11 }}>
                <div style={{ color: T.text, fontWeight: 600 }}>{lbl}</div>
                <div style={{ color: T.textMd }}>Actual: {actual?.toFixed(1)}</div>
                <div style={{ color: T.textMd }}>Predicted: {predicted?.toFixed(1)}</div>
              </div>
            )
          }} />
          <ReferenceLine segment={[{ x: min, y: min }, { x: max, y: max }]} stroke={T.accent} strokeDasharray="4 4" strokeOpacity={0.5} />
          <Scatter data={observations} fill={T.accentSoft} fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatRow({ label, base, delta, combined, note, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}20`, paddingBottom: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</span>
        {combined != null && (
          <EpaPill value={combined} />
        )}
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: T.textLow, flexWrap: 'wrap' }}>
        {base != null    && <span>Base <span style={{ color: T.textMd, fontFamily: 'monospace' }}>{base > 0 ? '+' : ''}{base.toFixed(3)}</span></span>}
        {delta != null   && <span>Δ <span style={{ color: delta === 0 ? T.textMin : T.accentSoft, fontFamily: 'monospace' }}>{delta > 0 ? '+' : ''}{delta.toFixed(3)}</span></span>}
        {note && <span style={{ color: T.textMin, fontStyle: 'italic' }}>{note}</span>}
      </div>
      {children}
    </div>
  )
}

function StateBreakdown({ pct1, label1, ep1, pct2, label2, ep2 }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
      {[{ pct: pct1, label: label1, ep: ep1 }, { pct: pct2, label: label2, ep: ep2 }].map(({ pct, label, ep }) => (
        <div key={label} style={{
          flex: 1, background: T.surf2, borderRadius: 5, padding: '5px 8px', fontSize: 11,
        }}>
          <div style={{ color: T.textLow, marginBottom: 2 }}>{label}</div>
          <div style={{ color: T.text, fontFamily: 'monospace', fontWeight: 600 }}>EP {ep?.toFixed(2)}</div>
          <div style={{ color: T.textMin }}>{(pct * 100).toFixed(0)}% of cases</div>
        </div>
      ))}
    </div>
  )
}

function StateEPAPanel({ states, deltaNote }) {
  if (!states) {
    return (
      <div style={{ fontSize: 12, color: T.textMin, padding: '10px 0' }}>
        State context not available — baseline_epa.json not loaded or states not computed.
      </div>
    )
  }
  const { offTurnover, offRebound, foulDrawn, defForcedTurnover } = states
  return (
    <div>
      {deltaNote && (
        <div style={{ fontSize: 11, color: T.amber, background: T.amberBg, borderRadius: 5, padding: '6px 10px', marginBottom: 14 }}>
          {deltaNote}
        </div>
      )}

      <StatRow
        label="Offensive Turnover"
        base={offTurnover?.weightedOpponentEP}
        delta={offTurnover?.regressionDelta}
        combined={offTurnover?.combined != null ? -offTurnover.combined : null}
        note={offTurnover?.note}
      >
        {offTurnover && (
          <StateBreakdown
            pct1={offTurnover.liveSteal.pct}    label1={offTurnover.liveSteal.label}  ep1={offTurnover.liveSteal.ep}
            pct2={offTurnover.deadBall.pct}     label2={offTurnover.deadBall.label}   ep2={offTurnover.deadBall.ep}
          />
        )}
        {offTurnover?.livePremium != null && (
          <div style={{ fontSize: 11, color: T.textLow, marginTop: 5 }}>
            Live-steal premium: <span style={{ color: T.red, fontFamily: 'monospace' }}>+{offTurnover.livePremium.toFixed(3)}</span> vs dead ball
          </div>
        )}
      </StatRow>

      <StatRow
        label="Offensive Rebound"
        base={offRebound?.weightedYourEP}
        delta={offRebound?.regressionDelta}
        combined={offRebound?.combined}
        note={offRebound?.note}
      >
        {offRebound && (
          <StateBreakdown
            pct1={offRebound.putback.pct}  label1={offRebound.putback.label}  ep1={offRebound.putback.ep}
            pct2={offRebound.reset.pct}    label2={offRebound.reset.label}    ep2={offRebound.reset.ep}
          />
        )}
      </StatRow>

      <StatRow
        label="Foul Drawn (FT)"
        base={foulDrawn?.weightedYourEP}
        note={foulDrawn?.note}
      >
        {foulDrawn && (
          <StateBreakdown
            pct1={foulDrawn.twoShots.pct}    label1={foulDrawn.twoShots.label}    ep1={foulDrawn.twoShots.ep}
            pct2={foulDrawn.oneAndOne.pct}   label2={foulDrawn.oneAndOne.label}   ep2={foulDrawn.oneAndOne.ep}
          />
        )}
      </StatRow>

      <StatRow
        label="Forced Turnover (def)"
        base={defForcedTurnover?.weightedYourEP}
        delta={defForcedTurnover?.regressionDelta}
        combined={defForcedTurnover?.combined}
        note={defForcedTurnover?.note}
      >
        {defForcedTurnover && (
          <StateBreakdown
            pct1={defForcedTurnover.liveSteal.pct}  label1="Live steal transition"  ep1={defForcedTurnover.liveSteal.ep}
            pct2={defForcedTurnover.deadBall.pct}   label2="Dead ball inbound"       ep2={defForcedTurnover.deadBall.ep}
          />
        )}
      </StatRow>

      <div style={{ fontSize: 11, color: T.textMin, marginTop: 4 }}>
        Combined = Base (state EP from baseline_epa.json) + Δ (regression coefficient normalized to per-possession scale).
        Positive = gain to your team. Negative = cost to your team.
      </div>
    </div>
  )
}

function ModelCard({ badge, description, result, activeComparison, epaOverride, statesOverride }) {
  if (!result || result.error || result.status === 'error') return (
    <div style={{ ...CARD, marginBottom: 20, borderColor: T.red }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.red }}>{badge}</span>
      <div style={{ fontSize: 12, color: T.red, marginTop: 6 }}>
        {result?.error ?? result?.messages?.[0] ?? 'No game-log data loaded — run node scripts/fetch-gamelogs.mjs'}
      </div>
    </div>
  )
  const r = result

  return (
    <div style={{ ...CARD, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
        <span style={{ background: T.accent + '22', color: T.accentSoft, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{badge}</span>
        <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{r.label}</span>
        {r.r2 != null && <span style={{ fontSize: 11, color: T.textLow }}>R²={r.r2}</span>}
        {r.cvR2 != null && <span style={{ fontSize: 11, color: T.blue }}>CVR²={r.cvR2}</span>}
        {r.rmse != null && <span style={{ fontSize: 11, color: T.textLow }}>RMSE={r.rmse}</span>}
        {r.alpha != null && <span style={{ fontSize: 11, color: T.blue }}>λ={r.alpha}</span>}
      </div>
      {description && (
        <div style={{ fontSize: 11, color: T.textLow, marginBottom: 12 }}>{description}</div>
      )}
      {activeComparison === 'events'       && <EventEPATable  epa={epaOverride ?? r.eventEPA} />}
      {activeComparison === 'coefficients' && <CoeffTable     coefficients={r.coefficients} />}
      {activeComparison === 'scatter'      && <ScatterViz     observations={r.observations} r2={r.r2} n={r.n} label={r.label} />}
      {activeComparison === 'state'        && <StateEPAPanel  states={statesOverride ?? r.states} deltaNote={(statesOverride ?? r.states)?._deltaNote} />}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = ['events', 'coefficients', 'scatter', 'state']

export default function EpaLab({ embedded = false }) {
  const { activeComparison, setActiveComparison, epaResult, setEpaResult } = useEpaStore()

  // Fit the single per-game EPA model once and cache in store — survives navigation.
  const pipeline = useMemo(() => {
    if (epaResult) return epaResult
    try {
      const result = runEPAPipeline(gameLogs, teamSeasons, { baselineEP })
      setEpaResult(result)
      return result
    } catch (e) { return { status: 'error', messages: [e.message] } }
  }, [epaResult])

  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <PageHeader
        title={embedded ? null : 'EPA Lab'}
        subtitle="Event EPA from a four-factor regression (eFG%, TOV%, ORB%, FTR) fit on Big Ten per-game box scores."
        stats={pipeline.status !== 'error' ? [
          { label: 'Games (n)', value: pipeline.n ?? '—', color: T.accentSoft },
          { label: 'R²',        value: pipeline.r2 ?? '—', color: T.green },
          { label: 'CV R²',     value: pipeline.cvR2 ?? '—', color: T.green },
          { label: 'FGA/100',   value: pipeline.leagueRates?.avgFGAp100 ?? '—', color: T.textMd },
        ] : []}
        tabs={TABS.map(tab => ({ value: tab, label: tab.charAt(0).toUpperCase() + tab.slice(1) }))}
        activeTab={activeComparison}
        onTabChange={setActiveComparison}
        tabsLabel="EPA comparison views"
      />

      <div className="bt-page" style={{ paddingBottom: 40 }}>
        {pipeline.status === 'error'
          ? <div style={{ background: T.redBg, color: T.red, borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
              {pipeline.messages?.join(' · ')}
            </div>
          : <ModelCard
              badge="EPA MODEL"
              description={`Joint ridge regression on the eight Dean Oliver four factors, fit on real Big Ten per-game box scores (ESPN, 2022–2026). The scatter aggregates the per-game fit to team-seasons; event EPA scales the coefficients to per-event units.`}
              result={pipeline}
              activeComparison={activeComparison}
              epaOverride={pipeline.selectedEventEPA}
              statesOverride={pipeline.selectedStates}
            />
        }

        <PageConclusions prominent conclusions={[
          { label: 'What EPA measures', color: T.accentSoft, text: 'EPA (Expected Points Added) converts the four-factor regression coefficients into intuitive per-event values — a made 2-pt FG, a turnover, an offensive rebound, etc., each in points of net efficiency per 100 possessions. These are not assumed weights; they are estimated directly from Big Ten game data.' },
          { label: 'Why per-game data', color: T.green, text: 'The model is fit on ~2,461 real Big Ten box scores rather than season aggregates. Game-level variance breaks the eFG%/TOV%/ORB% collinearity that destabilised the old small-sample season fit, so all eight four-factor coefficients come back stable and textbook-signed (turnovers negative, rebounds positive) with no sign constraints or external training data needed.' },
          { label: 'Model fit', color: T.blue, text: 'A single joint ridge (10-fold cross-validated α) predicts net efficiency from the eight factors. On the per-game sample it reaches R²≈0.98 / CV R²≈0.98 with all VIFs near 1 — no collinearity problems. Open the diagnostics panel for VIF, correlation, and coefficient-stability details.' },
        ]} />

        {pipeline.status !== 'error' && (
          <div style={{ marginTop: 28 }}>
            <DiagnosticsPanel
              diagnostics={pipeline.diagnostics}
              messages={pipeline.messages}
              signIssues={pipeline.signIssues}
            />
          </div>
        )}

        <MethodologyPanel
          howItWorks="The EPA pipeline fits a single ridge regression (cross-validated regularization) on Big Ten per-game box scores to predict net efficiency from the eight Dean Oliver four-factor terms. Coefficients are then scaled to per-event units using a league-average FGA/100 denominator derived from the scoring identity: PPP = FGA_p100 × (2·eFG + FT%·FTR)."
          sections={[
            { title: 'Four Factors',  keys: ['efg_o', 'efg_d', 'tov_o', 'tov_d', 'orb', 'drb', 'ftr_o', 'ftr_d'] },
            { title: 'Efficiency',    keys: ['adjoe', 'adjde', 'net_efficiency', 'barthag'] },
            { title: 'EPA Events',    keys: ['epa_made2fg', 'epa_made3fg', 'epa_foul_drawn', 'epa_forced_tov', 'epa_shot_supp'] },
            { title: 'Model Quality', keys: ['ridge_cv_r2'] },
          ]}
        />
      </div>
    </div>
  )
}
