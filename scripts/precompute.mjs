// Build-time precompute for app-wide calibration constants.
//
// What this caches:
//   - calibrateWinPctModel(games, teamSeasons)  — slope, homeBonus, n
//   - calibratePythagoreanExp(teamSeasons)      — α at each mode (raw + adjusted)
//
// Why it's here (not at runtime): these are deterministic functions of
// teamSeasons.json + games.json. Computing them on every browser tab load burns
// 50ms-2s per visitor for the same answer. Bake them into a JSON file instead,
// and the runtime imports the constants for free. (The EPA model is fit live
// from gameLogs.json — it's fast enough not to need precomputing.)
//
// Run:        npm run precompute
// Re-run:     whenever teamSeasons / games changes.
//
// The runtime call sites check `dataHash` against the current data and fall
// back to live compute if the JSON has gone stale.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { calibrateWinPctModel, calibratePythagoreanExp } from '../src/utils/calibration.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir   = join(__dirname, '..', 'src', 'data')

const teamSeasons = JSON.parse(readFileSync(join(dataDir, 'teamSeasons.json'), 'utf8'))
const games       = JSON.parse(readFileSync(join(dataDir, 'games.json'),       'utf8'))

// Cheap content fingerprint: row counts + a sum that depends on win_pct.
// If teamSeasons or games changes, this changes; the runtime detects the
// mismatch and falls back to live compute instead of trusting stale JSON.
function dataHash(seasons, gms) {
  const wpSum = seasons.reduce((s, t) => s + (t.win_pct ?? 0), 0)
  return `ts${seasons.length}-g${gms.length}-wp${wpSum.toFixed(3)}`
}

const winModel    = calibrateWinPctModel(games, teamSeasons)
const pyAdjusted  = calibratePythagoreanExp(teamSeasons, { mode: 'adjusted' })
const pyRaw       = calibratePythagoreanExp(teamSeasons, { mode: 'raw'      })

const out = {
  generatedAt: new Date().toISOString(),
  dataHash:    dataHash(teamSeasons, games),
  winModel,
  pyAdjusted,
  pyRaw,
}

const outPath = join(dataDir, 'precomputedStats.json')
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')

console.log(`Wrote ${outPath}`)
console.log(`  dataHash:   ${out.dataHash}`)
console.log(`  winModel:   slope=${winModel.slope}, homeBonus=${winModel.homeBonus}, n=${winModel.n}`)
console.log(`  pyAdjusted: α=${pyAdjusted.exponent} (n=${pyAdjusted.n})`)
console.log(`  pyRaw:      α=${pyRaw.exponent} (n=${pyRaw.n})`)
