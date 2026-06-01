// ESPN men's college basketball team IDs for the 18 Big Ten members, keyed by
// our canonical slug (see src/data/constants.js SCHOOLS). Script-only — the
// browser app never needs ESPN ids. Used by fetch-games.mjs (and the optional
// fetch-gamelogs.mjs) to hit ESPN's schedule API and to resolve each opponent
// back to our slug by its ESPN team id (robust — no name matching).
//
// Resolved from
// https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=500
export const ESPN_ID = {
  illinois:      356,
  indiana:       84,
  iowa:          2294,
  maryland:      120,
  michigan:      130,
  'michigan-st': 127,
  minnesota:     135,
  nebraska:      158,
  northwestern:  77,
  'ohio-st':     194,
  oregon:        2483,
  'penn-st':     213,
  purdue:        2509,
  rutgers:       164,
  ucla:          26,
  usc:           30,
  washington:    264,
  wisconsin:     275,
}

// Reverse lookup: ESPN team id (as string) -> our slug.
export const SLUG_BY_ESPN_ID = Object.fromEntries(
  Object.entries(ESPN_ID).map(([slug, id]) => [String(id), slug]),
)
