// Standalone test suite — no test framework required.
// Run: node scripts/test-epa-models.mjs
// Exit 0 = all pass, exit 1 = failures.
//
// Covers the unified EPA model: a single four-factor ridge fit on Big Ten
// per-game box scores (gameLogs.json), in standard/textbook encoding.

import { readFileSync } from 'fs'
import { runEPAPipeline } from '../src/utils/epaModels/pipeline.js'
import { validateTeamSeasons, validateGameLogs } from '../src/utils/epaModels/validate.js'
import { computeLeagueRates, convertToEventEPA } from '../src/utils/epaModels/epaConversion.js'
import { fitRidge, fitConstrained } from '../src/utils/epaModels/models.js'
import { nnls } from '../src/utils/epaModels/matrixOps.js'

const teamSeasons = JSON.parse(readFileSync('./src/data/teamSeasons.json'))
const gameLogs    = JSON.parse(readFileSync('./src/data/gameLogs.json'))
const baselineEP  = JSON.parse(readFileSync('./src/data/baseline_epa.json'))

let passed = 0, failed = 0

function assert(condition, name, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.error(`  ✗ ${name}${detail ? ': ' + detail : ''}`)
    failed++
  }
}

// ── 1. Game-log validation ────────────────────────────────────────────────────
console.log('\n[1] Game-log validation')
const gv = validateGameLogs(gameLogs)
assert(gv.ok,            'real game logs validate successfully')
assert(gv.synthetic === false, 'real game logs are not flagged synthetic')
assert(!validateGameLogs([]).ok, 'empty game logs fail validation')
// Placeholder data (carries source fields but all points zeroed) is still caught.
const zeroed = gameLogs.slice(0, 30).map(g => ({ ...g, pts: 0, opp_pts: 0 }))
assert(validateGameLogs(zeroed).synthetic === true, 'zeroed/placeholder logs flagged synthetic')
assert(validateTeamSeasons(teamSeasons, 'raw').ok, 'team-seasons (league-rate source) validate')

// ── 2. Ridge solver ───────────────────────────────────────────────────────────
console.log('\n[2] Ridge regression solver')
const X = [[1,1,2],[1,2,3],[1,3,1],[1,4,2],[1,5,3]]
const y = [3, 5, 4, 7, 8]
const m = fitRidge(X, y, 1.0, ['a', 'b'])
assert(m.beta.length === 3,  'ridge returns intercept + 2 coefficients')
assert(m.r2 >= 0 && m.r2 <= 1, `ridge R² in [0,1], got ${m.r2}`)

// ── 3. NNLS solver ────────────────────────────────────────────────────────────
console.log('\n[3] NNLS (constrained solver)')
const x = nnls([[1, 2], [1, 3], [1, 4]], [3, 4.5, 6])
assert(x.every(v => v >= -1e-9), 'NNLS solution is non-negative')
assert(x.length === 2, 'NNLS returns correct length')

// ── 4. Constrained OLS enforces signs ─────────────────────────────────────────
console.log('\n[4] Constrained OLS')
const mc = fitConstrained([[1,2,3],[1,3,2],[1,4,5],[1,5,4],[1,6,7],[1,7,6]], [5,4,8,7,12,11], ['a','b'], { a: 1, b: 1 })
assert(!mc.error, 'constrained fit succeeds')
assert(mc.beta[1] >= -1e-9 && mc.beta[2] >= -1e-9, 'constrained coefficients ≥ 0')

// ── 5. League rates + EPA conversion (textbook encoding) ──────────────────────
console.log('\n[5] EPA conversion')
const rates = computeLeagueRates(teamSeasons)
assert(rates.avgFGAp100 > 80 && rates.avgFGAp100 < 100, `avgFGAp100 ~88 (not 48), got ${rates.avgFGAp100}`)
// Textbook coeffs: turnover negative, rebound positive — conversion must NOT flip them.
const mockCoeffs = { off_eFG: 1.3, off_TOV: -0.5, off_ORB: 0.4, off_FTR: 0.2,
                     def_eFG: -1.2, def_TOV: 0.3, def_ORB: -0.4, def_FTR: -0.2 }
const conv = convertToEventEPA(mockCoeffs, rates, null, { encoding: 'textbook' })
assert('values' in conv && 'meta' in conv, 'conversion returns {values, meta}')
assert('denominator' in conv.meta, 'meta documents the denominator')
assert(conv.values.made3FG > conv.values.made2FG, '3FG EPA > 2FG EPA')
assert(conv.values.offTurnover < 0, 'textbook: turnover EPA is negative (not flipped)')
assert(conv.values.offRebound > 0, 'textbook: offensive-rebound EPA is positive')

// ── 6. Unified per-game pipeline ──────────────────────────────────────────────
console.log('\n[6] Unified per-game pipeline')
const r = runEPAPipeline(gameLogs, teamSeasons, { baselineEP })
assert(r.status === 'ok', 'pipeline runs without error')
assert(r.n > 1000, `pipeline fits on the full per-game sample (n=${r.n})`)
assert(r.r2 > 0.9 && r.r2 <= 1, `in-sample R² high (${r.r2})`)
assert(r.cvR2 > 0.9 && r.cvR2 <= 1, `cross-validated R² high (${r.cvR2})`)
assert(r.leagueRates?.avgFGAp100 > 0, 'leagueRates included in output')
assert(r.convMeta !== undefined, 'convMeta included')
assert(Array.isArray(r.observations) && r.observations.length > 0, 'scatter observations (team-season aggregated)')

// ── 7. Coefficient signs are textbook-correct and stable ──────────────────────
console.log('\n[7] Coefficient signs')
assert(r.signIssues.length === 0, `no sign issues (${JSON.stringify(r.signIssues)})`)
const c = r.coefficients
assert(c.off_eFG > 0, 'off_eFG > 0')
assert(c.off_TOV < 0, 'off_TOV < 0 (turnovers hurt)')
assert(c.off_ORB > 0, 'off_ORB > 0 (offensive rebounds help)')
assert(c.def_eFG < 0, 'def_eFG < 0 (opponent shooting hurts)')
assert(c.def_TOV > 0, 'def_TOV > 0 (forcing turnovers helps)')
assert(c.def_ORB < 0, 'def_ORB < 0 (opponent rebounds hurt)')

// ── 8. Event EPA reads naturally ──────────────────────────────────────────────
console.log('\n[8] Event EPA signs')
const e = r.eventEPA
assert(e.made2FG > 0,            'made 2FG positive')
assert(e.made3FG > e.made2FG,    '3FG worth more than 2FG')
assert(e.offTurnover < 0,        'offensive turnover negative')
assert(e.offRebound > 0,         'offensive rebound positive')
assert(e.foulDrawn > 0,          'foul drawn positive')
assert(e.defForcedTurnover > 0,  'forced turnover positive')
assert(e.defShotSuppression > 0, 'shot suppression positive')

// ── 9. VIF diagnostics ────────────────────────────────────────────────────────
console.log('\n[9] VIF diagnostics')
const vif = r.diagnostics.vif
assert(vif && Object.keys(vif).length === 8, `VIF has 8 entries, got ${vif ? Object.keys(vif).length : 0}`)
assert(Object.values(vif).every(v => isFinite(v) && v >= 1), 'all VIFs ≥ 1')
assert(Object.values(vif).every(v => v < 5), 'all VIFs < 5 — per-game data breaks the collinearity')

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) { console.error('SOME TESTS FAILED'); process.exit(1) }
else { console.log('ALL TESTS PASSED'); process.exit(0) }
