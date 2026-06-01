/**
 * fetch-games.mjs — build src/data/games.json (each Big Ten team's full
 * schedule with final scores), sourced from ESPN.
 *
 * Run:    npm run fetch-games        (after npm run fetch-data)
 * Output: src/data/games.json
 *
 * Why ESPN and not Barttorvik: this only needs scores + location + opponent,
 * all of which ESPN's schedule endpoint returns in ONE call per team-season —
 * no per-game box-score sub-fetches. (Detailed box scores for Tier-2 EPA live
 * in fetch-gamelogs.mjs instead.)
 *
 * Conference membership comes from teamSeasons.json, so this must run after
 * fetch-data.mjs. A game is conf_game only when BOTH teams are Big Ten members
 * that season — which correctly excludes, e.g., a 2023 Michigan-vs-UCLA game
 * (UCLA was Pac-12 then). Only (team, year) pairs present in teamSeasons are
 * fetched, so the schema stays aligned with the sparse 18-team union panel.
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ESPN_ID, SLUG_BY_ESPN_ID } from './lib/espn-teams.mjs'

const __dir    = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dir, '../src/data')

const teamSeasons = JSON.parse(readFileSync(join(DATA_DIR, 'teamSeasons.json'), 'utf8'))

// Big Ten membership: `${slug}|${year}` for every team-season we have data for.
const membership = new Set(teamSeasons.map(t => `${t.school}|${t.year}`))

const DELAY_MS = 350

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'big-ten-basketball-analytics/1.0' } })
      if (res.status === 429) { await sleep(5000); continue }
      if (!res.ok) return null
      return await res.json()
    } catch {
      if (attempt === retries - 1) return null
      await sleep(1000 * (attempt + 1))
    }
  }
  return null
}

async function main() {
  const games = []
  let fetched = 0, skipped = 0

  for (const { school: slug, year } of teamSeasons) {
    const espnId = ESPN_ID[slug]
    if (espnId == null) { console.warn(`  no ESPN id for ${slug} — skipping`); continue }

    process.stdout.write(`${slug} ${year}  `)
    const sched = await fetchJSON(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${espnId}/schedule?season=${year}`
    )
    if (!sched?.events?.length) { console.log('(no events)'); await sleep(DELAY_MS); continue }

    for (const event of sched.events) {
      const comp = event.competitions?.[0]
      if (comp?.status?.type?.description !== 'Final') continue // skip future / in-progress

      const ours = comp.competitors?.find(c => String(c.team?.id) === String(espnId))
      const opp  = comp.competitors?.find(c => c !== ours)
      if (!ours || !opp) { skipped++; continue }

      const ptsFor     = Number(ours.score?.value)
      const ptsAgainst = Number(opp.score?.value)
      if (!Number.isFinite(ptsFor) || !Number.isFinite(ptsAgainst)) { skipped++; continue }

      const oppSlug   = SLUG_BY_ESPN_ID[String(opp.team?.id)] ?? null
      const oppSchool = oppSlug && membership.has(`${oppSlug}|${year}`) ? oppSlug : null

      games.push({
        school:      slug,
        year,
        date:        event.date?.slice(0, 10) ?? null,
        home:        ours.homeAway === 'home',
        neutral:     comp.neutralSite ?? false,
        game_type:   'REG',
        opp_name:    opp.team?.displayName ?? 'Unknown',
        opp_slug:    opp.team?.slug ?? '',
        opp_school:  oppSchool,                 // slug if a Big Ten opponent this season, else null
        conf_game:   oppSchool != null,         // both teams Big Ten members that season
        win:         ptsFor > ptsAgainst,
        pts_for:     ptsFor,
        pts_against: ptsAgainst,
      })
      fetched++
    }
    console.log(`(${fetched} total)`)
    await sleep(DELAY_MS)
  }

  // Stable ordering: school, then year, then date.
  games.sort((a, b) =>
    a.school.localeCompare(b.school) || a.year - b.year || String(a.date).localeCompare(String(b.date))
  )

  writeFileSync(join(DATA_DIR, 'games.json'), JSON.stringify(games, null, 2))
  const confGames = games.filter(g => g.conf_game).length
  console.log(`\nWrote ${games.length} games to src/data/games.json (${confGames} conference games, ${skipped} skipped)`)
}

main().catch(err => { console.error(err); process.exit(1) })
