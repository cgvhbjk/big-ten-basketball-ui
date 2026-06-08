// Canonical team-key derivation. Barttorvik display names ("Michigan St.",
// "Ohio St.") become clean slugs used as the join key across teamSeasons.json,
// players.json, games.json, and SCHOOL_META below. Single source of truth —
// imported by both the browser app and the node fetch scripts (../scripts).
export function slugify(name) {
  return String(name).toLowerCase().replace(/\./g, '').trim().replace(/\s+/g, '-')
}

// Big Ten — 18-team union after the 2024–25 realignment. The four West-Coast
// newcomers (ucla, usc, oregon, washington) only carry Big Ten data from 2025;
// their earlier seasons are absent by design (they were Pac-12). Each slug
// equals slugify(<Barttorvik name>). Badge text is white, so colors run dark
// enough to stay legible (TeamBadge adds a luminance fallback for the lighter
// hues). With 18 teams some scatter-fill colors are unavoidably close — six
// reds/scarlets, two purples — chosen as far apart as brand identity allows.
export const SCHOOLS = [
  'illinois', 'indiana', 'iowa', 'maryland', 'michigan', 'michigan-st',
  'minnesota', 'nebraska', 'northwestern', 'ohio-st', 'oregon', 'penn-st',
  'purdue', 'rutgers', 'ucla', 'usc', 'washington', 'wisconsin',
]

export const SCHOOL_META = {
  illinois:      { abbr: 'ILL', fullName: 'Illinois Fighting Illini', color: '#E84A27' },
  indiana:       { abbr: 'IND', fullName: 'Indiana Hoosiers',         color: '#990000' },
  iowa:          { abbr: 'IOW', fullName: 'Iowa Hawkeyes',            color: '#C8A415' },
  maryland:      { abbr: 'MAR', fullName: 'Maryland Terrapins',       color: '#E03A3E' },
  michigan:      { abbr: 'MCH', fullName: 'Michigan Wolverines',      color: '#00274C' },
  'michigan-st': { abbr: 'MSU', fullName: 'Michigan State Spartans',  color: '#18453B' },
  minnesota:     { abbr: 'MIN', fullName: 'Minnesota Golden Gophers', color: '#7A0019' },
  nebraska:      { abbr: 'NEB', fullName: 'Nebraska Cornhuskers',     color: '#E41D25' },
  northwestern:  { abbr: 'NWU', fullName: 'Northwestern Wildcats',    color: '#4E2A84' },
  'ohio-st':     { abbr: 'OSU', fullName: 'Ohio State Buckeyes',      color: '#BB0000' },
  oregon:        { abbr: 'ORE', fullName: 'Oregon Ducks',             color: '#154733' },
  'penn-st':     { abbr: 'PSU', fullName: 'Penn State Nittany Lions', color: '#1E407C' },
  purdue:        { abbr: 'PUR', fullName: 'Purdue Boilermakers',      color: '#B1810B' },
  rutgers:       { abbr: 'RUT', fullName: 'Rutgers Scarlet Knights',  color: '#CC0033' },
  ucla:          { abbr: 'UCL', fullName: 'UCLA Bruins',              color: '#2774AE' },
  usc:           { abbr: 'USC', fullName: 'USC Trojans',              color: '#9D2235' },
  washington:    { abbr: 'WAS', fullName: 'Washington Huskies',       color: '#39275B' },
  wisconsin:     { abbr: 'WIS', fullName: 'Wisconsin Badgers',        color: '#C5050C' },
}

export const SCHOOL_COLORS = Object.fromEntries(
  Object.entries(SCHOOL_META).map(([k, v]) => [k, v.color])
)

// Years with real data from Barttorvik
export const YEARS = [2022, 2023, 2024, 2025, 2026]

// ---- Team metric definitions ----
// Groups are ordered top-to-bottom by how directly they answer "how good is this team?"
// Insertion order = display order in dropdowns and metric browser.
export const TEAM_METRICS = [
  // ── Outcomes ───────────────────────────────────────────────────────────────
  { key: 'win_pct',       label: 'Win %',              group: 'Outcomes', higherBetter: true,  fmt: v => (v * 100).toFixed(1) + '%' },
  { key: 'conf_win_pct',  label: 'Conf Win %',          group: 'Outcomes', higherBetter: true,  fmt: v => (v * 100).toFixed(1) + '%' },
  { key: 'barthag',       label: 'Predictive Win %',    group: 'Outcomes', higherBetter: true,  fmt: v => (v * 100).toFixed(1) + '%' },

  // ── Efficiency ─────────────────────────────────────────────────────────────
  { key: 'adjoe',         label: 'Adj. Off. Efficiency', group: 'Efficiency', higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'adjde',         label: 'Adj. Def. Efficiency', group: 'Efficiency', higherBetter: false, fmt: v => v.toFixed(1) },
  { key: 'net_efficiency',label: 'Net Efficiency',        group: 'Efficiency', higherBetter: true,  fmt: v => (v > 0 ? '+' : '') + v.toFixed(1) },
  { key: 'ppp',           label: 'Points Per 100 Poss',  group: 'Efficiency', higherBetter: true,  fmt: v => v.toFixed(2) },
  { key: 'opp_ppp',       label: 'Opp Points Per 100',   group: 'Efficiency', higherBetter: false, fmt: v => v.toFixed(2) },
  { key: 'net_ppp',       label: 'Net PPP',               group: 'Efficiency', higherBetter: true,  fmt: v => (v > 0 ? '+' : '') + v.toFixed(2) },

  // ── Scoring ────────────────────────────────────────────────────────────────
  { key: 'pts_pg',        label: 'Points/G',             group: 'Scoring', higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'opp_pts_pg',    label: 'Opp Points/G',         group: 'Scoring', higherBetter: false, fmt: v => v.toFixed(1) },

  // ── Offensive Four Factors ─────────────────────────────────────────────────
  { key: 'efg_o',         label: 'eFG% (Off)',           group: 'Off. Four Factors', higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'tov_o',         label: 'Turnover % (Off)',     group: 'Off. Four Factors', higherBetter: false, fmt: v => v.toFixed(1) + '%' },
  { key: 'orb',           label: 'Off. Rebound %',       group: 'Off. Four Factors', higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'ftr_o',         label: 'FT Rate (Off)',        group: 'Off. Four Factors', higherBetter: true,  fmt: v => v.toFixed(1) },

  // ── Defensive Four Factors ─────────────────────────────────────────────────
  { key: 'efg_d',         label: 'eFG% Allowed',         group: 'Def. Four Factors', higherBetter: false, fmt: v => v.toFixed(1) + '%' },
  { key: 'tov_d',         label: 'Turnover % Forced',    group: 'Def. Four Factors', higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'drb',           label: 'Def. Rebound %',       group: 'Def. Four Factors', higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'ftr_d',         label: 'FT Rate Allowed',      group: 'Def. Four Factors', higherBetter: false, fmt: v => v.toFixed(1) },

  // ── Shooting ───────────────────────────────────────────────────────────────
  { key: 'three_pct_o',   label: '3P% (Off)',            group: 'Shooting', higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'three_pct_d',   label: '3P% Allowed',          group: 'Shooting', higherBetter: false, fmt: v => v.toFixed(1) + '%' },
  { key: 'three_rate_o',  label: '3-Point Attempt Rate', group: 'Shooting', higherBetter: null,  fmt: v => v.toFixed(1) + '%' },
  { key: 'two_pct_o',     label: '2P% (Off)',            group: 'Shooting', higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'two_pct_d',     label: '2P% Allowed',          group: 'Shooting', higherBetter: false, fmt: v => v.toFixed(1) + '%' },
  { key: 'ft_pct',        label: 'Free Throw %',         group: 'Shooting', higherBetter: true,  fmt: v => v.toFixed(1) + '%' },

  // ── Rebounding ─────────────────────────────────────────────────────────────
  // Opponent team rebounds aren't carried by the Barttorvik feeds (games.json
  // has scores only, players.json covers our own roster), so opp_trb_pg and the
  // derived reb_margin are intentionally omitted rather than shown as empty.
  { key: 'trb_pg',        label: 'Rebounds/G',           group: 'Rebounding', higherBetter: true,  fmt: v => v.toFixed(1) },

  // ── Playmaking ─────────────────────────────────────────────────────────────
  { key: 'ast_pg',        label: 'Assists/G',            group: 'Playmaking', higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'tov_pg',        label: 'Turnovers/G',          group: 'Playmaking', higherBetter: false, fmt: v => v.toFixed(1) },
  { key: 'ast_to_ratio',  label: 'Assist / TO Ratio',    group: 'Playmaking', higherBetter: true,  fmt: v => v.toFixed(2) },

  // ── Defense ────────────────────────────────────────────────────────────────
  { key: 'stl_pg',        label: 'Steals/G',             group: 'Defense', higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'blk_pg',        label: 'Blocks/G',             group: 'Defense', higherBetter: true,  fmt: v => v.toFixed(1) },

  // ── Pace ───────────────────────────────────────────────────────────────────
  { key: 'tempo',         label: 'Tempo (poss/40 min)',  group: 'Pace', higherBetter: null, fmt: v => v.toFixed(1) },
]

export const TEAM_METRIC_MAP = Object.fromEntries(TEAM_METRICS.map(m => [m.key, m]))

// ---- Player metric definitions ----
export const PLAYER_METRICS = [
  { key: 'pts',     label: 'Points/G',          higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'treb',    label: 'Rebounds/G',         higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'ast',     label: 'Assists/G',          higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'stl',     label: 'Steals/G',           higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'blk',     label: 'Blocks/G',           higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'ortg',    label: 'Off Rating',         higherBetter: true,  fmt: v => v.toFixed(1) },
  { key: 'drtg',    label: 'Def Rating',         higherBetter: false, fmt: v => v.toFixed(1) },
  { key: 'usg',     label: 'Usage %',            higherBetter: null,  fmt: v => v.toFixed(1) + '%' },
  { key: 'bpm',     label: 'BPM',                higherBetter: true,  fmt: v => (v > 0 ? '+' : '') + v.toFixed(2) },
  { key: 'efg',     label: 'eFG%',               higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'ts_pct',  label: 'True Shooting %',    higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'ft_pct',  label: 'FT%',                higherBetter: true,  fmt: v => v.toFixed(1) + '%' },
  { key: 'min_pg',  label: 'Min/G',              higherBetter: null,  fmt: v => v.toFixed(1) },
  // or_pct and ast_pct were removed from this list because the values in
  // players.json are not the percentages the labels imply: or_pct is a
  // Barttorvik national rank (typical 1–270) and ast_pct is stored as a small
  // decimal (0.1–0.8). Rendering them as `${v}%` produced strings like
  // "202.0%" and "0.4%". The per-game `treb`/`oreb`/`ast` already cover the
  // same conceptual ground for display.
]

export const PLAYER_METRIC_MAP = Object.fromEntries(PLAYER_METRICS.map(m => [m.key, m]))
