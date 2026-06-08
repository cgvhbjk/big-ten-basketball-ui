import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import teamSeasons from '../data/teamSeasons.json'
import players from '../data/players.json'
import games from '../data/games.json'
import { SCHOOLS, SCHOOL_META, SCHOOL_COLORS, YEARS, TEAM_METRIC_MAP } from '../data/constants.js'
import { radarDot, textHaloShadow, resolveTeamColor } from '../utils/teamColor.js'
import useStore from '../store/useStore.js'
import usePlayerStore from '../store/usePlayerStore.js'
import TeamBadge from '../components/shared/TeamBadge.jsx'
import InfoTooltip from '../components/InfoTooltip.jsx'
import StatCard from '../components/shared/StatCard.jsx'
import PageHeader from '../components/shared/PageHeader.jsx'
import Accordion from '../components/shared/Accordion.jsx'
import PageConclusions from '../components/shared/PageConclusions.jsx'
import MethodologyPanel from '../components/shared/MethodologyPanel.jsx'
import { T } from '../styles/theme.js'
import {
  classifyOffScheme, classifyDefScheme, deriveSchemeThresholds,
  comparePositionProfiles, generateMatchupInsights, generatePlayerRoleSummary,
  parseHeightIn, classifySchemeFromRoster, computeTeamArchetype,
} from '../utils/insightEngine.js'
import { predictWinPctCalibrated } from '../utils/calibration.js'
import { getWinModel } from '../utils/calibrationCache.js'

// Win-probability model: reads from build-time precomputedStats.json when the
// data hash matches; otherwise falls back to live fit. See calibration.js.
const WIN_MODEL = getWinModel(games, teamSeasons)

const SEL = { background: '#1a1a1a', border: '1px solid #2c2c2c', color: '#ebebeb', borderRadius: 6, padding: '6px 10px', fontSize: 13 }
const CARD = { background: '#111111', border: '1px solid #2c2c2c', borderRadius: 12, padding: '20px 24px' }
const SECTION_TITLE = { fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginBottom: 12 }

function norm(v, min, max) {
  if (v == null || max === min) return 0.5
  return Math.max(0, Math.min(1, (v - min) / (max - min)))
}

const RADAR_AXES = [
  { key: 'adjoe',  label: 'Offense',   min: 90,  max: 120, higherBetter: true  },
  { key: 'adjde',  label: 'Defense',   min: 95,  max: 120, higherBetter: false },
  { key: 'efg_o',  label: 'Shooting',  min: 44,  max: 58,  higherBetter: true  },
  { key: 'tov_d',  label: 'Force TOs', min: 14,  max: 32,  higherBetter: true  },
  { key: 'orb',    label: 'Off Reb',   min: 8,   max: 36,  higherBetter: true  },
  { key: 'tempo',  label: 'Tempo',     min: 58,  max: 76,  higherBetter: null  },
]

const FOUR_FACTORS = [
  { key: 'efg_o', label: 'eFG% (Off)',    higherBetter: true,  fmt: v => v.toFixed(1)+'%' },
  { key: 'efg_d', label: 'eFG% Allowed',  higherBetter: false, fmt: v => v.toFixed(1)+'%' },
  { key: 'tov_o', label: 'TOV% (Off)',    higherBetter: false, fmt: v => v.toFixed(1)+'%' },
  { key: 'tov_d', label: 'TOV% Forced',   higherBetter: true,  fmt: v => v.toFixed(1)+'%' },
  { key: 'orb',   label: 'Off Reb %',     higherBetter: true,  fmt: v => v.toFixed(1)+'%' },
  { key: 'drb',   label: 'Def Reb %',     higherBetter: true,  fmt: v => v.toFixed(1)+'%' },
  { key: 'ftr_o', label: 'FT Rate (Off)', higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'ftr_d', label: 'FT Rate (Def)', higherBetter: false, fmt: v => v.toFixed(1) },
]


// Calibrated win-probability for a hypothetical neutral-court matchup. The
// slope, intercept, and home bonus all come from logistic regression on the
// full conference game record (see calibration.js). The previous version used
// a hard-coded slope of 0.12 with no intercept and no home effect.
function predictWinPct(adjoeA, adjdeA, adjoeB, adjdeB, home = 0) {
  const diff = (adjoeA - adjdeA) - (adjoeB - adjdeB)
  return predictWinPctCalibrated(WIN_MODEL, diff, home)
}

// Qualitative band for a win-probability — keeps users from over-reading
// 73% as "true probability to the percent". The model has finite precision
// (slope SE ~0.026 on n=236, plus the irreducible single-game variance),
// so we collapse to a textual band that matches the model's actual resolution.
function winPctBand(p) {
  if (p == null) return null
  const fav = p >= 0.5 ? p : 1 - p
  if (fav < 0.53) return { label: 'Toss-up',         level: 0 }
  if (fav < 0.60) return { label: 'Slight edge',      level: 1 }
  if (fav < 0.70) return { label: 'Clear favorite',   level: 2 }
  if (fav < 0.80) return { label: 'Strong favorite',  level: 3 }
  return                  { label: 'Heavy favorite',  level: 4 }
}

// Round to the nearest 5% band (e.g. 0.673 → "65–70%"). Used when the
// projection is cross-year and the precise number is over-precise.
function winPctRange(p) {
  if (p == null) return null
  const pct = p * 100
  const lo  = Math.floor(pct / 5) * 5
  return `${lo}–${lo + 5}%`
}

// "Same year" projections show the percent; "cross-year" projections collapse
// to the band + 5%-range so the UI doesn't claim a precision the model can't
// support across rating-recalibration boundaries. Honors the probability the
// caller passes in — when both teams' win-prob stats are rendered, the
// underdog must show its actual probability, not the favorite's flipped one.
function fmtWinPctDisplay(p, crossYear) {
  if (p == null) return null
  if (crossYear) return winPctRange(p)
  return `${(p * 100).toFixed(0)}%`
}

function inchesToFtIn(inches) {
  if (inches == null) return '—'
  return `${Math.floor(inches / 12)}'${Math.round(inches % 12)}"`
}

// CompareRow — one head-to-head stat as a calm "A · label · B" row. The
// winner keeps full weight with a ▸/◂ arrow pointing at it; the loser dims.
// Far lighter than a grid of boxed StatCards for the core-numbers view.
function CompareRow({ label, a, b, colorA, colorB, higherBetter, fmt, info }) {
  const f = (v) => (v == null ? '—' : fmt ? fmt(v) : v.toFixed(1))
  let aWins = null
  if (higherBetter !== null && a != null && b != null && a !== b) aWins = higherBetter ? a > b : a < b
  // Winner: team color + bold + a ▲ marker (non-color cue). Loser: still fully
  // legible (muted grey), just not emphasised — no opacity dimming.
  const cell = (str, color, isWin) => (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: 5,
      fontSize: 20, fontWeight: isWin ? 800 : 600,
      color: isWin ? color : T.textMd, fontVariantNumeric: 'tabular-nums',
      textShadow: isWin ? textHaloShadow(color) : 'none',
    }}>
      {isWin && <span aria-hidden="true" style={{ fontSize: 10, color }}>▲</span>}
      {str}
    </span>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 116px 1fr', alignItems: 'center', padding: '13px 0', borderTop: `1px solid ${T.border}` }}>
      <div style={{ textAlign: 'center' }}>{cell(f(a), colorA, aWins === true)}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: T.textLow, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
        {info && <InfoTooltip label={info.label} text={info.text} />}
      </div>
      <div style={{ textAlign: 'center' }}>{cell(f(b), colorB, aWins === false)}</div>
    </div>
  )
}

function NotablePlayerCard({ player, teamColor, onPlayerClick }) {
  if (!player) return null
  const heightIn = parseHeightIn(player.height)
  const role = generatePlayerRoleSummary(player)
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '12px 14px', border: `1px solid ${teamColor}22` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <button
            onClick={() => onPlayerClick?.(player)}
            title="Open in Player Lab"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
              fontSize: 13, fontWeight: 600, color: teamColor, fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
            {player.name}
          </button>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{player.pos_type} · {player.class_yr} · {heightIn ? inchesToFtIn(heightIn) : player.height}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#ebebeb' }}>{player.pts?.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: '#4b5563' }}>pts/g</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, fontStyle: 'italic' }}>{role}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
        {[
          ['REB', player.treb != null ? player.treb.toFixed(1) : '—'],
          ['AST', player.ast  != null ? player.ast.toFixed(1)  : '—'],
          ['eFG', player.efg  != null ? player.efg.toFixed(1) + '%' : '—'],
          ['BPM', player.bpm  != null ? (player.bpm > 0 ? '+' : '') + player.bpm.toFixed(1) : '—'],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{ textAlign: 'center', background: '#0e0e0e', borderRadius: 4, padding: '4px 0' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#ebebeb' }}>{val}</div>
            <div style={{ fontSize: 9, color: '#4b5563' }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RadarTooltip({ active, payload, metaA, metaB, colorA, colorB }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d || d.rawA == null && d.rawB == null) return null

  const fmt = (key, val) => {
    if (val == null) return '—'
    const m = TEAM_METRIC_MAP[key]
    return m?.fmt ? m.fmt(val) : val.toFixed(1)
  }

  const aWins = d.higherBetter === true
    ? d.rawA > d.rawB
    : d.higherBetter === false
      ? d.rawA < d.rawB
      : null

  const EDGE = '#10b981'
  const BASE = '#ebebeb'

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #3c3c3c', borderRadius: 8, padding: '10px 14px', fontSize: 12, minWidth: 170 }}>
      <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 8 }}>{d.axis}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: colorA, fontWeight: 600 }}>{metaA.abbr}</span>
          <span style={{ color: aWins === true ? EDGE : BASE, fontWeight: aWins === true ? 700 : 400 }}>
            {fmt(d.metricKey, d.rawA)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: colorB, fontWeight: 600 }}>{metaB.abbr}</span>
          <span style={{ color: aWins === false ? EDGE : BASE, fontWeight: aWins === false ? 700 : 400 }}>
            {fmt(d.metricKey, d.rawB)}
          </span>
        </div>
      </div>
      {aWins !== null && d.rawA != null && d.rawB != null && (
        <div style={{ marginTop: 7, fontSize: 10, color: '#6b7280', borderTop: '1px solid #2c2c2c', paddingTop: 6 }}>
          {aWins ? metaA.abbr : metaB.abbr} leads · {d.higherBetter ? 'higher is better' : 'lower is better'}
        </div>
      )}
    </div>
  )
}

export default function MatchupAnalyzer({ embedded = false }) {
  const {
    analyzerTeamA, analyzerTeamB, analyzerYearA, analyzerYearB,
    setAnalyzerTeamA, setAnalyzerTeamB, setAnalyzerYearA, setAnalyzerYearB,
  } = useStore()

  const [activeSection, setActiveSection] = useState('overview')
  // Position aggregates (used by the conclusions' "position edge") weight by
  // minutes played — what coaches actually see on the floor.
  const posWeightBy = 'minutes'

  const navigate = useNavigate()
  const setPlayerFromMatchup = usePlayerStore(s => s.setPlayerFromMatchup)
  const openPlayer = (p) => {
    if (!p?.name || !p?.school || !p?.year) return
    setPlayerFromMatchup({ school: p.school, year: p.year, name: p.name })
    navigate('/players', { state: { from: 'matchup' } })
  }

  const colorA = resolveTeamColor(analyzerTeamA)
  const colorB = resolveTeamColor(analyzerTeamB)
  const metaA  = SCHOOL_META[analyzerTeamA]
  const metaB  = SCHOOL_META[analyzerTeamB]

  const seasonA = useMemo(() =>
    teamSeasons.find(s => s.school === analyzerTeamA && s.year === analyzerYearA)
  , [analyzerTeamA, analyzerYearA])

  const seasonB = useMemo(() =>
    teamSeasons.find(s => s.school === analyzerTeamB && s.year === analyzerYearB)
  , [analyzerTeamB, analyzerYearB])

  const squadA = useMemo(() =>
    players.filter(p => p.school === analyzerTeamA && p.year === analyzerYearA && p.min_pg >= 5)
      .sort((a, b) => b.min_pg - a.min_pg)
  , [analyzerTeamA, analyzerYearA])

  const squadB = useMemo(() =>
    players.filter(p => p.school === analyzerTeamB && p.year === analyzerYearB && p.min_pg >= 5)
      .sort((a, b) => b.min_pg - a.min_pg)
  , [analyzerTeamB, analyzerYearB])

  // Conference-relative scheme cut-points, derived once from the full dataset.
  const schemeThr = useMemo(() => deriveSchemeThresholds(teamSeasons), [])
  const schemeOffA = useMemo(() => seasonA ? classifyOffScheme(seasonA, schemeThr) : '—', [seasonA, schemeThr])
  const schemeOffB = useMemo(() => seasonB ? classifyOffScheme(seasonB, schemeThr) : '—', [seasonB, schemeThr])
  const schemeDefA = useMemo(() => seasonA ? classifyDefScheme(seasonA, schemeThr) : '—', [seasonA, schemeThr])
  const schemeDefB = useMemo(() => seasonB ? classifyDefScheme(seasonB, schemeThr) : '—', [seasonB, schemeThr])

  const posCompare = useMemo(() =>
    comparePositionProfiles(squadA, squadB, { weightBy: posWeightBy })
  , [squadA, squadB, posWeightBy])

  const rosterSchemeA = useMemo(() => classifySchemeFromRoster(seasonA, squadA), [seasonA, squadA])
  const rosterSchemeB = useMemo(() => classifySchemeFromRoster(seasonB, squadB), [seasonB, squadB])
  const archetypeA    = useMemo(() => computeTeamArchetype(squadA, seasonA),    [squadA, seasonA])
  const archetypeB    = useMemo(() => computeTeamArchetype(squadB, seasonB),    [squadB, seasonB])

  const matchupInsights = useMemo(() =>
    generateMatchupInsights(seasonA, seasonB, posCompare, schemeOffA, schemeOffB, metaA.abbr, metaB.abbr)
  , [seasonA, seasonB, posCompare, schemeOffA, schemeOffB, metaA.abbr, metaB.abbr])

  const winPctA = useMemo(() => {
    if (!seasonA || !seasonB) return null
    return predictWinPct(seasonA.adjoe, seasonA.adjde, seasonB.adjoe, seasonB.adjde)
  }, [seasonA, seasonB])

  const radarData = useMemo(() => RADAR_AXES.map(ax => {
    const vA = seasonA?.[ax.key]
    const vB = seasonB?.[ax.key]
    const nA = norm(vA, ax.min, ax.max)
    const nB = norm(vB, ax.min, ax.max)
    return {
      axis: ax.label,
      A: Math.max(0.05, ax.higherBetter === false ? 1 - nA : nA),
      B: Math.max(0.05, ax.higherBetter === false ? 1 - nB : nB),
      rawA: vA,
      rawB: vB,
      metricKey: ax.key,
      higherBetter: ax.higherBetter,
    }
  }), [seasonA, seasonB])

  const notableA = useMemo(() => squadA.filter(p => p.min_pg >= 10).slice(0, 3), [squadA])
  const notableB = useMemo(() => squadB.filter(p => p.min_pg >= 10).slice(0, 3), [squadB])

  const crossYear = analyzerYearA !== analyzerYearB

  // Win probability KPI stat for header (declared before conclusions so it can be used inside)
  const winPctStr  = winPctA !== null ? fmtWinPctDisplay(winPctA,        crossYear) : null
  const winPctStrB = winPctA !== null ? fmtWinPctDisplay(1 - winPctA,    crossYear) : null
  const winBand    = winPctBand(winPctA)
  const netA       = seasonA ? ((seasonA.adjoe - seasonA.adjde) > 0 ? '+' : '') + (seasonA.adjoe - seasonA.adjde).toFixed(1) : null
  const netB       = seasonB ? ((seasonB.adjoe - seasonB.adjde) > 0 ? '+' : '') + (seasonB.adjoe - seasonB.adjde).toFixed(1) : null

  const conclusions = useMemo(() => {
    if (!seasonA || !seasonB) return []
    const items = []

    // Win probability — banded to match what the model actually supports.
    if (winPctA !== null) {
      const fav     = winPctA >= 0.5 ? metaA.abbr : metaB.abbr
      const display = fmtWinPctDisplay(Math.max(winPctA, 1 - winPctA), crossYear)
      const netDiff = Math.abs((seasonA.adjoe - seasonA.adjde) - (seasonB.adjoe - seasonB.adjde)).toFixed(1)
      const phrase  = crossYear
        ? `${winBand.label.toLowerCase()} at ~${display}`
        : `${winBand.label.toLowerCase()} at ${display}`
      items.push({
        label: 'Win Prob.',
        text: `${fav} ${phrase} — gap driven by a ${netDiff}-pt net efficiency differential (${metaA.abbr}: ${netA}, ${metaB.abbr}: ${netB}).${crossYear ? ' Cross-year projection: AdjOE/AdjDE are calibrated against different national pools each season, so the % reflects directional edge, not precise probability.' : ''}`,
        color: winPctA >= 0.5 ? colorA : colorB,
      })
    }

    // Defensive edge
    if (seasonA.adjde != null && seasonB.adjde != null) {
      const defDiff = seasonA.adjde - seasonB.adjde
      if (Math.abs(defDiff) >= 2) {
        const betterDef = defDiff < 0 ? metaA.abbr : metaB.abbr
        const worseDef  = defDiff < 0 ? metaB.abbr : metaA.abbr
        items.push({
          label: 'Defense',
          text: `${betterDef} holds opponents to ${Math.min(seasonA.adjde, seasonB.adjde).toFixed(1)} pts/100 (${worseDef}: ${Math.max(seasonA.adjde, seasonB.adjde).toFixed(1)}) — a ${Math.abs(defDiff).toFixed(1)}-pt defensive edge. ${worseDef} must create high-quality looks rather than relying on volume.`,
          color: T.cyan,
        })
      }
    }

    // Tempo battle
    const tempoDiff = (seasonA.tempo ?? 0) - (seasonB.tempo ?? 0)
    if (Math.abs(tempoDiff) >= 2) {
      const faster = tempoDiff > 0 ? metaA.abbr : metaB.abbr
      const slower = tempoDiff > 0 ? metaB.abbr : metaA.abbr
      items.push({
        label: 'Pace',
        text: `${faster} plays ${Math.abs(tempoDiff).toFixed(1)} possessions/40 faster. ${faster} wants transition, open-floor spacing, and early offense. ${slower} must force half-court sets and avoid live-ball turnovers.`,
        color: T.cyan,
      })
    }

    // Shooting edge
    const efgEdge  = (seasonA.efg_o ?? 0) - (seasonB.efg_d ?? 0)
    const efgEdgeB = (seasonB.efg_o ?? 0) - (seasonA.efg_d ?? 0)
    const maxEdge  = Math.abs(efgEdge) >= Math.abs(efgEdgeB) ? efgEdge : -efgEdgeB
    if (Math.abs(maxEdge) > 1.5) {
      const shooter = maxEdge > 0 ? metaA.abbr : metaB.abbr
      items.push({
        label: 'Shooting',
        text: maxEdge > 0
          ? `${shooter} shoots ${Math.abs(maxEdge).toFixed(1)} eFG pts above what the opponent's defense allows — expect efficient half-court possessions.`
          : `Defensive resistance limits ${shooter} — shooting volume attack and free-throw generation will be key to manufacturing points.`,
        color: maxEdge > 0 ? T.green : T.amber,
      })
    }

    // Turnover battle
    const tovAdvA    = (seasonA.tov_d ?? 0) - (seasonB.tov_o ?? 0)
    const tovAdvB    = (seasonB.tov_d ?? 0) - (seasonA.tov_o ?? 0)
    const netTovEdge = tovAdvA - tovAdvB
    if (Math.abs(netTovEdge) >= 3 && seasonA.tov_d != null && seasonB.tov_d != null) {
      const tovTeam  = netTovEdge > 0 ? metaA.abbr : metaB.abbr
      const tovOpp   = netTovEdge > 0 ? metaB.abbr : metaA.abbr
      const forceRate = (netTovEdge > 0 ? seasonA.tov_d : seasonB.tov_d).toFixed(1)
      const oppRate   = (netTovEdge > 0 ? seasonB.tov_o : seasonA.tov_o)?.toFixed(1)
      items.push({
        label: 'Turnovers',
        text: `${tovTeam} has the turnover edge — forcing ${forceRate}% TOs vs ${tovOpp}'s ${oppRate}% baseline. Ball security will likely decide swing possessions in the half-court.`,
        color: T.amber,
      })
    }

    // FT rate edge
    if (seasonA.ftr_o != null && seasonB.ftr_o != null) {
      const ftrDiff = seasonA.ftr_o - seasonB.ftr_o
      if (Math.abs(ftrDiff) >= 5) {
        const moreFT = ftrDiff > 0 ? metaA.abbr : metaB.abbr
        items.push({
          label: 'FT Attack',
          text: `${moreFT} gets to the line at a ${Math.abs(ftrDiff).toFixed(0)}% higher rate. Drawing fouls is a key scoring mechanism — opponents must discipline closeouts and post defense to avoid bonus situations.`,
          color: T.green,
        })
      }
    }

    // Scheme clash
    items.push({
      label: 'Schemes',
      text: `${metaA.abbr} runs ${schemeOffA} offensively and ${schemeDefA} defensively. ${metaB.abbr} counters with ${schemeOffB} / ${schemeDefB}. Expect ${schemeOffA.includes('Transition') || schemeOffA.includes('Run') ? 'up-tempo pressure from ' + metaA.abbr : 'controlled half-court execution from ' + metaA.abbr}.`,
      color: T.amber,
    })

    // Strongest position edge
    const edgeRows = posCompare
      .filter(r => r.diffHeightIn != null)
      .sort((a, b) => Math.abs(b.diffHeightIn) - Math.abs(a.diffHeightIn))
    if (edgeRows.length && Math.abs(edgeRows[0].diffHeightIn) >= 1) {
      const r = edgeRows[0]
      const taller = r.diffHeightIn > 0 ? metaA.abbr : metaB.abbr
      const ortgNote = r.diffOrtg != null && Math.abs(r.diffOrtg) >= 3
        ? ` ORTG advantage: ${r.diffOrtg > 0 ? metaA.abbr : metaB.abbr} by ${Math.abs(r.diffOrtg).toFixed(0)} pts/100.`
        : ''
      items.push({
        label: r.position + ' Edge',
        text: `${taller}'s ${r.position.toLowerCase()}s are ${Math.abs(r.diffHeightIn).toFixed(1)}" taller on average.${ortgNote} This favors ${taller} in ${r.position === 'Big' ? 'interior play, rebounding, and shot contesting' : 'ball-screen execution and perimeter switching scenarios'}.`,
        color: r.diffHeightIn > 0 ? colorA : colorB,
      })
    }

    // Bottom Line — always shown
    const netEffA   = (seasonA.adjoe ?? 0) - (seasonA.adjde ?? 0)
    const netEffB   = (seasonB.adjoe ?? 0) - (seasonB.adjde ?? 0)
    const edgeTeam  = netEffA >= netEffB ? metaA.abbr : metaB.abbr
    const edgeColor = netEffA >= netEffB ? colorA : colorB
    const margin    = Math.abs(netEffA - netEffB).toFixed(1)
    const probStr   = winPctA != null
      ? (crossYear
          ? `${winBand.label.toLowerCase()} (~${fmtWinPctDisplay(Math.max(winPctA, 1 - winPctA), true)} band)`
          : `${winBand.label.toLowerCase()} at ${fmtWinPctDisplay(Math.max(winPctA, 1 - winPctA), false)}`)
      : 'a net efficiency edge'
    const swingLabels = items.filter(i => ['Pace','Shooting','Turnovers','FT Attack','Defense'].includes(i.label)).map(i => i.label.toLowerCase())
    items.push({
      label: 'Bottom Line',
      text: `${edgeTeam} is the stronger team by ${margin} pts/100 net efficiency (${probStr}). ${swingLabels.length ? `Key swing factors: ${swingLabels.join(', ')}.` : 'This is a tightly matched contest where execution will outweigh statistical advantages.'}${crossYear ? ' ⚠ Cross-year projection — adjusted ratings shift across seasons; treat as directional.' : ''}`,
      color: edgeColor,
    })

    return items
  }, [seasonA, seasonB, winPctA, winBand, metaA, metaB, netA, netB, schemeOffA, schemeOffB, schemeDefA, schemeDefB, posCompare, colorA, colorB, crossYear])

  return (
    <div style={{ background: T.bg, minHeight: '100vh' }}>
      <PageHeader
        title={embedded ? null : `${metaA.abbr} vs ${metaB.abbr}`}
        subtitle={embedded ? null : `${metaA.fullName} ${analyzerYearA} · ${metaB.fullName} ${analyzerYearB} · Head-to-head breakdown`}
        stats={winPctA !== null ? [
          { label: `${metaA.abbr} win prob.`, value: winPctStr,  color: colorA, note: winBand?.label },
          { label: `${metaB.abbr} win prob.`, value: winPctStrB, color: colorB },
          { label: `${metaA.abbr} Net Eff`,   value: netA, color: netA?.startsWith('+') ? T.green : T.red },
          { label: `${metaB.abbr} Net Eff`,   value: netB, color: netB?.startsWith('+') ? T.green : T.red },
        ] : []}
        controls={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamBadge school={analyzerTeamA} size="sm" showName={false} />
              <select style={SEL} value={analyzerTeamA} onChange={e => setAnalyzerTeamA(e.target.value)}>
                {SCHOOLS.map(s => <option key={s} value={s}>{SCHOOL_META[s].fullName}</option>)}
              </select>
              <select style={SEL} value={analyzerYearA} onChange={e => setAnalyzerYearA(+e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <span style={{ color: T.textMin, fontSize: 13, fontWeight: 700 }}>vs</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamBadge school={analyzerTeamB} size="sm" showName={false} />
              <select style={SEL} value={analyzerTeamB} onChange={e => setAnalyzerTeamB(e.target.value)}>
                {SCHOOLS.map(s => <option key={s} value={s}>{SCHOOL_META[s].fullName}</option>)}
              </select>
              <select style={SEL} value={analyzerYearB} onChange={e => setAnalyzerYearB(+e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {crossYear && (
              <span
                title="Adjusted ratings (AdjOE/AdjDE) are calibrated against different national pools each year. Cross-year projections show banded probability instead of a precise percent."
                style={{
                  fontSize: 11, fontWeight: 600,
                  background: '#f59e0b22', color: '#f59e0b',
                  border: '1px solid #f59e0b66',
                  borderRadius: 4, padding: '3px 8px',
                  letterSpacing: '0.04em',
                }}>
                ⚠ Cross-year — banded only
              </span>
            )}
          </div>
        }
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'roster',   label: 'Rosters' },
          { value: 'insights', label: 'Practice Insights' },
        ]}
        activeTab={activeSection}
        onTabChange={setActiveSection}
        tabsLabel="Matchup sections"
      />

      <div className="bt-page" style={{ paddingBottom: 28, maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Overview ── */}
      {activeSection === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Verdict — the one answer, stated plainly and up top */}
          {winPctA !== null && (() => {
            const aFav     = winPctA >= 0.5
            const favMeta  = aFav ? metaA : metaB
            const favColor = aFav ? colorA : colorB
            const favPct   = fmtWinPctDisplay(Math.max(winPctA, 1 - winPctA), crossYear)
            const aPct     = Math.round(winPctA * 100)
            return (
              <div style={{ ...CARD, padding: '22px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, color: T.textLow, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Projected edge</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: favColor, letterSpacing: '-0.02em', lineHeight: 1.1, textShadow: textHaloShadow(favColor) }}>
                      {favMeta.fullName}
                    </div>
                    <div style={{ fontSize: 14, color: T.textMd, marginTop: 4 }}>
                      {winBand?.label} · {crossYear ? '~' : ''}{favPct} win probability
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: T.textLow, textAlign: 'right' }}>
                    {metaA.abbr} {seasonA?.record} &nbsp;·&nbsp; {metaB.abbr} {seasonB?.record}
                  </div>
                </div>
                {/* win-probability split bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colorA, minWidth: 38 }}>{aPct}%</span>
                  <div style={{ flex: 1, height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', background: T.surf2 }}>
                    <div style={{ width: `${aPct}%`, background: colorA }} />
                    <div style={{ width: `${100 - aPct}%`, background: colorB }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colorB, minWidth: 38, textAlign: 'right' }}>{100 - aPct}%</span>
                </div>
              </div>
            )
          })()}

          {/* Key numbers + radar — the four that matter, then a visual profile */}
          <div className="bt-grid bt-grid--sidebar" style={{ gap: 20 }}>
            <div style={CARD}>
              <div style={SECTION_TITLE}>Key numbers</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 116px 1fr', padding: '0 0 6px' }}>
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: colorA, textShadow: textHaloShadow(colorA) }}>{metaA.abbr}</div>
                <div />
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: colorB, textShadow: textHaloShadow(colorB) }}>{metaB.abbr}</div>
              </div>
              {[
                { key: 'net_efficiency', label: 'Net Eff', info: { label: 'Net Efficiency', text: 'Offense minus defense. The single best one-number summary of team strength; higher is better.' } },
                { key: 'adjoe',          label: 'Offense', info: { label: 'Offense (Adjusted Offensive Efficiency)', text: 'Adjusted offensive efficiency — points scored per 100 possessions, adjusted for opponent strength. Higher is better.' } },
                { key: 'adjde',          label: 'Defense', info: { label: 'Defense (Adjusted Defensive Efficiency)', text: 'Adjusted defensive efficiency — points allowed per 100 possessions, adjusted for opponent strength. Lower is better.' } },
                { key: 'tempo',          label: 'Tempo' },
              ].map(({ key, label, info }) => {
                const m = TEAM_METRIC_MAP[key]
                return (
                  <CompareRow key={key} label={label} info={info}
                    a={seasonA?.[key]} b={seasonB?.[key]}
                    colorA={colorA} colorB={colorB}
                    higherBetter={m.higherBetter} fmt={m.fmt} />
                )
              })}
            </div>

            <div style={CARD}>
              <div style={SECTION_TITLE}>Profile Radar</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 11, color: colorA, textShadow: textHaloShadow(colorA) }}>● {metaA.abbr}</span>
                <span style={{ fontSize: 11, color: colorB, textShadow: textHaloShadow(colorB) }}>● {metaB.abbr}</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                  <PolarGrid stroke="#2c2c2c" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Radar name={metaA.abbr} dataKey="A" stroke={colorA} fill={colorA} fillOpacity={0.18} strokeWidth={2} dot={radarDot(colorA)} isAnimationActive={false} />
                  <Radar name={metaB.abbr} dataKey="B" stroke={colorB} fill={colorB} fillOpacity={0.18} strokeWidth={2} dot={radarDot(colorB)} isAnimationActive={false} />
                  <Tooltip content={<RadarTooltip metaA={metaA} metaB={metaB} colorA={colorA} colorB={colorB} />} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: '#374151', textAlign: 'center', marginTop: 4 }}>
                Normalized within conference range · Outer = better
              </div>
            </div>
          </div>

          {/* Everything dense is one click away — keeps the default view calm */}
          <Accordion title="Four factors & shooting detail">
            <div className="bt-grid bt-grid--2" style={{ gap: 10 }}>
              {FOUR_FACTORS.map(f => (
                <StatCard key={f.key} label={f.label}
                  valueA={seasonA?.[f.key]} valueB={seasonB?.[f.key]}
                  colorA={colorA} colorB={colorB}
                  higherBetter={f.higherBetter} fmt={f.fmt} />
              ))}
            </div>
          </Accordion>

          <Accordion title="Schemes & archetype">
            <div className="bt-grid bt-grid--2" style={{ gap: 16 }}>
              {[
                { school: analyzerTeamA, year: analyzerYearA, color: colorA, offScheme: schemeOffA, defScheme: schemeDefA, meta: metaA },
                { school: analyzerTeamB, year: analyzerYearB, color: colorB, offScheme: schemeOffB, defScheme: schemeDefB, meta: metaB },
              ].map(({ school, year, color, offScheme, defScheme, meta }, i) => (
                <div key={i} style={{ background: T.surf2, borderRadius: 10, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, borderBottom: `1px solid ${T.border}`, paddingBottom: 12 }}>
                    <TeamBadge school={school} size="md" showName={false} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color, textShadow: textHaloShadow(color) }}>{meta.fullName}</div>
                      <div style={{ fontSize: 11, color: T.textMin }}>{year}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ background: T.bgDeep, borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: T.textLow, marginBottom: 3 }}>OFF SCHEME</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.amber }}>{offScheme}</div>
                    </div>
                    <div style={{ background: T.bgDeep, borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: T.textLow, marginBottom: 3 }}>DEF SCHEME</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>{defScheme}</div>
                    </div>
                  </div>
                  {(() => {
                    const rs = school === analyzerTeamA ? rosterSchemeA : rosterSchemeB
                    const at = school === analyzerTeamA ? archetypeA : archetypeB
                    return (
                      <div style={{ fontSize: 11, color: T.textLow }}>
                        Roster-predicted: <span style={{ color: T.amber }}>{rs.offScheme}</span> / <span style={{ color: T.accentSoft }}>{rs.defScheme}</span> · archetype <span style={{ color }}>{at.archetype}</span>
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          </Accordion>
        </div>
      )}

      {/* ── Rosters: notable players + depth charts ── */}
      {activeSection === 'roster' && (
        <div className="bt-grid bt-grid--2" style={{ gap: 20 }}>
          {[
            { school: analyzerTeamA, year: analyzerYearA, squad: squadA, color: colorA, meta: metaA, notable: notableA },
            { school: analyzerTeamB, year: analyzerYearB, squad: squadB, color: colorB, meta: metaB, notable: notableB },
          ].map(({ school, squad, color, meta, year, notable }, i) => (
            <div key={i}>
              <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 14, textShadow: textHaloShadow(color) }}>
                {meta.fullName} · {year}
              </div>
              {/* Notable players */}
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Notable Players</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {notable.map(p => (
                  <NotablePlayerCard key={p.name} player={p} teamColor={color} onPlayerClick={openPlayer} />
                ))}
              </div>

              {/* Depth chart */}
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Depth Chart (by minutes)</div>
              <div style={{ background: '#111111', border: '1px solid #2c2c2c', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 44px 44px 52px', background: '#0c0c0c' }}>
                  {['Player', 'Min', 'Pts', 'Reb', 'Ast', 'eFG%'].map(h => (
                    <div key={h} style={{ padding: '7px 10px', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2c2c2c' }}>{h}</div>
                  ))}
                </div>
                {squad.filter(p => p.min_pg >= 6).slice(0, 10).map(p => (
                  <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '1fr 44px 44px 44px 44px 52px', borderBottom: '1px solid #0e0e0e' }}>
                    <div style={{ padding: '7px 10px', fontSize: 12, color }}>
                      <button
                        onClick={() => openPlayer(p)}
                        title="Open in Player Lab"
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          textAlign: 'left', color, fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}>
                        {p.name}
                      </button>
                      <div style={{ fontSize: 10, color: '#4b5563' }}>{p.pos_type} · {p.class_yr}</div>
                    </div>
                    {[p.min_pg?.toFixed(0), p.pts?.toFixed(1), p.treb?.toFixed(1), p.ast?.toFixed(1)].map((v, i) => (
                      <div key={i} style={{ padding: '7px 10px', fontSize: 12, color: '#ebebeb', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{v ?? '—'}</div>
                    ))}
                    <div style={{ padding: '7px 10px', fontSize: 12, color: '#9ca3af', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {p.efg != null ? p.efg.toFixed(1)+'%' : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Practice Insights ── */}
      {activeSection === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
            Actionable preparation insights based on statistical matchup analysis.
            Drill suggestions are starting points — substitute equivalents from your own playbook.
          </div>
          {matchupInsights.length === 0 && (
            <div style={{ color: '#4b5563', fontSize: 13 }}>Select two teams to generate insights.</div>
          )}
          {matchupInsights.map((ins, i) => (
            <div key={i} style={{ background: '#111111', border: '1px solid #2c2c2c', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{ins.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc' }}>{ins.category}</span>
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7 }}>{ins.text}</div>
              {ins.recommendedDrills?.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #2c2c2c' }}>
                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Suggested drills
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ins.recommendedDrills.map((d, j) => (
                      <div key={j} style={{ background: '#0c0c0c', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#ebebeb' }}>{d.name}</span>
                          <span style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic' }}>{d.focus}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, lineHeight: 1.5 }}>{d.protocol}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Scheme comparison — a tight full-width matrix (off/def × both teams) */}
          <div style={{ ...CARD, marginTop: 8 }}>
            <div style={SECTION_TITLE}>Scheme Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', alignItems: 'center', paddingBottom: 4 }}>
              <div />
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: colorA }}>{metaA.abbr}</div>
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: colorB }}>{metaB.abbr}</div>
            </div>
            {[
              { label: 'Offense', a: schemeOffA, b: schemeOffB, color: T.amber },
              { label: 'Defense', a: schemeDefA, b: schemeDefB, color: T.accentSoft },
            ].map(({ label, a, b, color }) => {
              const pill = (text) => (
                <span style={{
                  display: 'inline-block', fontSize: 14, fontWeight: 600, color,
                  background: `${color}1a`, border: `1px solid ${color}40`,
                  borderRadius: 999, padding: '6px 18px',
                }}>{text}</span>
              )
              return (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', alignItems: 'center', padding: '16px 0', borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 11, color: T.textLow, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                  <div style={{ textAlign: 'center' }}>{pill(a)}</div>
                  <div style={{ textAlign: 'center' }}>{pill(b)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

        <PageConclusions title="Matchup Conclusions" conclusions={conclusions} prominent />

        <MethodologyPanel
          howItWorks="The Matchup Analyzer compares two teams across adjusted efficiency, four factors, and roster profiles. Win probability is estimated using a logistic function on the net efficiency differential. Scheme labels (pace, off/def style) are derived from four-factor and tempo thresholds derived from the conference distribution."
          sections={[
            { title: 'Efficiency',   keys: ['adjoe', 'adjde', 'net_efficiency', 'barthag'] },
            { title: 'Four Factors', keys: ['efg_o', 'efg_d', 'tov_o', 'tov_d', 'orb', 'drb', 'ftr_o', 'ftr_d'] },
            { title: 'Shooting',     keys: ['three_pct_o', 'three_pct_d', 'three_rate_o', 'two_pct_o', 'two_pct_d', 'ft_pct'] },
            { title: 'Pace',         keys: ['tempo'] },
          ]}
        />
      </div>{/* end inner padding wrapper */}
    </div>
  )
}
