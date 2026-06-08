// EPA pipeline — a single four-factor model fit on Big Ten per-game box scores.
//
// Earlier versions ran two tiers (season-aggregate + per-game) plus a D1-wide
// training crutch, because conference-only season data (n≈78, acute in the Ivy
// sibling repo) was too small to recover stable TOV/ORB coefficients. With
// ~2,461 real Big Ten box scores the per-game fit is stable on its own
// (R²≈0.98, all eight textbook signs correct), so this is now the only model.
// `teamSeasons` is used solely to derive the league-rate denominator for the
// per-event EPA conversion.

import { DEFAULT_CONFIG } from './config.js'
import { validateGameLogs } from './validate.js'
import { ALL_FEATURES } from './features.js'
import { fitRidgeCV, checkSigns } from './models.js'
import { runDiagnostics } from './diagnostics.js'
import { computeLeagueRates, convertToEventEPA } from './epaConversion.js'

const ALPHAS = DEFAULT_CONFIG.ridge.alphas

// ── Game-factor helpers ───────────────────────────────────────────────────────

// Dean Oliver possession estimator
export function estimatePossessions(fga, orb, tov, fta) {
  return Math.max(fga - orb + tov + 0.44 * fta, 1)
}

// Compute per-100-possession four factors from one box score, in standard
// (textbook) direction: TOV% = turnovers/poss (higher worse), ORB% =
// offensive-rebound rate (higher better), etc. Returns null for rows that can't
// produce finite factors.
export function computeGameFactors(g) {
  const poss  = estimatePossessions(g.fga,     g.orb,     g.tov,     g.fta)
  const oPoss = estimatePossessions(g.opp_fga, g.opp_orb, g.opp_tov, g.opp_fta)
  if (g.fga === 0 || g.opp_fga === 0) return null

  // Derive points from box score if not stored (ESPN API omits points from statistics array)
  const pts     = g.pts     || (2 * g.fgm     + g.fg3m     + (g.ftm     ?? 0))
  const opp_pts = g.opp_pts || (2 * g.opp_fgm + g.opp_fg3m + (g.opp_ftm ?? 0))

  const eFG_o = ((g.fgm + 0.5 * g.fg3m) / g.fga) * 100
  const tov_o = (g.tov / poss) * 100
  // Rebound-rate denominators must guard 0 explicitly. `?? 0` only fills in for
  // a missing field; a real value of 0 (no rebounds at all) bails the row so a
  // contaminated rate never enters the fit.
  const orbDenom_o = g.orb + (g.opp_drb ?? 0)
  const orbDenom_d = g.opp_orb + (g.drb ?? 0)
  if (orbDenom_o === 0 || orbDenom_d === 0) return null
  const orb_o = (g.orb / orbDenom_o) * 100
  const ftr_o = (g.ftm / g.fga) * 100
  const eFG_d = ((g.opp_fgm + 0.5 * g.opp_fg3m) / g.opp_fga) * 100
  const tov_d = (g.opp_tov / oPoss) * 100
  const orb_d = (g.opp_orb / orbDenom_d) * 100
  const ftr_d = (g.opp_ftm / g.opp_fga) * 100
  const netEff = ((pts / poss) - (opp_pts / oPoss)) * 100

  const row = { eFG_o, tov_o, orb_o, ftr_o, eFG_d, tov_d, orb_d, ftr_d, netEff }
  const allFinite = Object.values(row).every(v => isFinite(v))
  return allFinite ? row : null
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length

export function runEPAPipeline(gameLogs, teamSeasons, opts = {}) {
  const baselineEP = opts.baselineEP ?? null

  // 1. Validate the box-score input (guards empty / placeholder data).
  const validation = validateGameLogs(gameLogs ?? [])
  if (!validation.ok) {
    return {
      status:   'error',
      messages: [...(validation.errors ?? []), ...(validation.warnings ?? [])],
    }
  }

  // 2. Per-game four factors. Keep school/year alongside each row so the scatter
  //    can aggregate to team-season (2,461 raw points would be unreadable).
  const factored = (gameLogs ?? [])
    .map(g => {
      const f = computeGameFactors(g)
      return f ? { ...f, school: g.school, year: g.year } : null
    })
    .filter(Boolean)

  if (factored.length < 20) {
    return { status: 'error', messages: [`Only ${factored.length} valid game rows after factor computation`] }
  }

  // 3. League rates for the EPA conversion denominator (FGA/100). Sourced from
  //    team-season aggregates — eFG/FTR/FT%/ppp are encoding-neutral.
  const leagueRates = computeLeagueRates(teamSeasons ?? [])

  // 4. Fit a single joint ridge (net efficiency ~ 8 four-factor terms).
  //    10-fold CV: LOO over thousands of rows would be far too slow.
  const X = factored.map(r => [1, r.eFG_o, r.tov_o, r.orb_o, r.ftr_o, r.eFG_d, r.tov_d, r.orb_d, r.ftr_d])
  const y = factored.map(r => r.netEff)

  let model
  try {
    model = fitRidgeCV(X, y, ALL_FEATURES, { alphas: ALPHAS, cvFolds: 10 })
  } catch (e) {
    return { status: 'error', messages: [e.message] }
  }

  const coefficients = {
    off_eFG: model.beta[1], off_TOV: model.beta[2],
    off_ORB: model.beta[3], off_FTR: model.beta[4],
    def_eFG: model.beta[5], def_TOV: model.beta[6],
    def_ORB: model.beta[7], def_FTR: model.beta[8],
  }
  const conv       = convertToEventEPA(coefficients, leagueRates, baselineEP, { modelVariant: 'joint', encoding: 'textbook' })
  const signIssues = checkSigns(model.beta, ALL_FEATURES)
  const n          = factored.length

  // 5. Diagnostics (VIF, correlation, CV-fold stability).
  const diag = (() => {
    try { return runDiagnostics(X, y, ALL_FEATURES, model.foldBetas) }
    catch { return null }
  })()
  const vifWarn = diag?.vifWarnings ?? []

  // 6. Scatter — aggregate per-game fit to team-season points (mean actual vs
  //    mean predicted), e.g. "Illinois 2026".
  const byTS = new Map()
  factored.forEach((r, i) => {
    const key = `${r.school} ${r.year}`
    if (!byTS.has(key)) byTS.set(key, { label: `${cap(r.school)} ${r.year}`, actuals: [], preds: [] })
    const o = byTS.get(key)
    o.actuals.push(y[i])
    o.preds.push(model.yHat[i])
  })
  const observations = [...byTS.values()].map(o => ({
    label:     o.label,
    actual:    +mean(o.actuals).toFixed(2),
    predicted: +mean(o.preds).toFixed(2),
  }))

  return {
    status:   'ok',
    messages: [...(validation.warnings ?? []), ...vifWarn.map(w => w.msg)],
    n,
    label:    `Big Ten per-game box scores · n=${n} · 2022–2026`,
    leagueRates,
    coefficients,
    selectedCoefficients: coefficients,
    eventEPA:             conv.values,
    selectedEventEPA:     conv.values,
    states:               conv.states,
    selectedStates:       conv.states,
    convMeta:             conv.meta,
    r2:        model.r2,
    cvR2:      model.cvR2,
    rmse:      model.rmse,
    alpha:     model.bestAlpha,
    signIssues,
    observations,
    diagnostics: {
      n,
      k:               ALL_FEATURES.length,
      obsPerPredictor: +(n / ALL_FEATURES.length).toFixed(1),
      vif:               diag?.vif ?? null,
      vifWarnings:       vifWarn,
      correlationMatrix: diag?.correlationMatrix ?? null,
      stability:         diag?.stability ?? null,
    },
  }
}
