/**
 * derive-aggregates.mjs — enrich teamSeasons.json with the per-game and
 * points-per-possession fields the app and tests expect.
 *
 * The Barttorvik team-slice endpoint (fetch-data.mjs) only carries adjusted
 * efficiency, four factors, shooting splits and tempo. The app additionally
 * references raw scoring (ppp / opp_ppp / net_ppp) and per-game box rates. Those
 * are derived here from sources we already fetched:
 *
 *   pts_pg / opp_pts_pg  ← mean points for / against in games.json
 *   ppp / opp_ppp        ← points per 100 possessions = pts_pg / tempo × 100
 *   net_ppp              ← ppp − opp_ppp
 *   trb/ast/stl/blk_pg   ← sum of the team's players' per-game rates (players.json)
 *   tov_pg               ← turnover% (per 100 poss) × tempo / 100
 *   ast_to_ratio         ← ast_pg / tov_pg
 *
 * Run after fetch-data + fetch-games:  node scripts/derive-aggregates.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const D = join(dirname(fileURLToPath(import.meta.url)), '../src/data')
const read = f => JSON.parse(readFileSync(join(D, f), 'utf8'))

const teamSeasons = read('teamSeasons.json')
const games       = read('games.json')
const players     = read('players.json')

const r = (v, n = 1) => (v == null || Number.isNaN(v) ? null : +v.toFixed(n))

const enriched = teamSeasons.map(ts => {
  const g      = games.filter(x => x.school === ts.school && x.year === ts.year)
  const roster = players.filter(p => p.school === ts.school && p.year === ts.year)
  const tempo  = ts.tempo

  const pts_pg     = g.length ? r(g.reduce((s, x) => s + (x.pts_for     || 0), 0) / g.length) : null
  const opp_pts_pg = g.length ? r(g.reduce((s, x) => s + (x.pts_against || 0), 0) / g.length) : null

  const ppp     = (pts_pg     != null && tempo) ? r(pts_pg     / tempo * 100, 2) : null
  const opp_ppp = (opp_pts_pg != null && tempo) ? r(opp_pts_pg / tempo * 100, 2) : null
  const net_ppp = (ppp != null && opp_ppp != null) ? r(ppp - opp_ppp, 2) : null

  const sum    = k => roster.reduce((s, p) => s + (p[k] || 0), 0)
  const trb_pg = roster.length ? r(sum('treb')) : null
  const ast_pg = roster.length ? r(sum('ast'))  : null
  const stl_pg = roster.length ? r(sum('stl'))  : null
  const blk_pg = roster.length ? r(sum('blk'))  : null

  // turnovers/game from the offensive turnover rate (per 100 poss) and pace
  const tov_pg       = (ts.tov_o != null && tempo) ? r(ts.tov_o / 100 * tempo) : null
  const ast_to_ratio = (ast_pg != null && tov_pg) ? r(ast_pg / tov_pg, 2) : null

  return { ...ts, pts_pg, opp_pts_pg, ppp, opp_ppp, net_ppp, trb_pg, ast_pg, stl_pg, blk_pg, tov_pg, ast_to_ratio }
})

writeFileSync(join(D, 'teamSeasons.json'), JSON.stringify(enriched, null, 2) + '\n')

const withPpp = enriched.filter(t => t.ppp != null).length
console.log(`Enriched ${enriched.length} team-seasons (${withPpp} with ppp/opp_ppp) → teamSeasons.json`)
