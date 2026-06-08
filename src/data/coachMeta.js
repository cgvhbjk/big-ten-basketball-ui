// Head coach and playstyle metadata per school and year.
// Sources: public school athletic department records. Verify for latest season.
//
// Scope: the 18-team Big Ten across the seasons in the dataset (2022–2025,
// where the year is the spring of the season — e.g. 2025 = the 2024–25 season).
// The four West-Coast newcomers (UCLA, USC, Oregon, Washington) only carry Big
// Ten *team* data from 2025, but their coaches are listed for all years so the
// lookup is complete if earlier rosters are ever added.

// Provenance — surfaced in the UI so consumers know this is a hand-curated
// approximation, not Barttorvik / official-source data.
export const COACH_META_INFO = {
  approximate: true,
  source: 'Hand-curated from public athletic-department pages',
  lastVerified: '2026-06',
  caveat: 'Playstyle descriptions are subjective summaries. Coach name/year mappings should be verified before publication or scouting use.',
}

export const COACH_META = {
  illinois: {
    2022: { name: 'Brad Underwood', style: 'Ball-screen heavy offense, switch-everything defense, up-tempo' },
    2023: { name: 'Brad Underwood', style: 'Ball-screen heavy offense, switch-everything defense, up-tempo' },
    2024: { name: 'Brad Underwood', style: 'Spacing-driven offense, aggressive perimeter defense' },
    2025: { name: 'Brad Underwood', style: 'Spacing-driven offense, aggressive perimeter defense, transition' },
  },
  indiana: {
    2022: { name: 'Mike Woodson', style: 'Two-big lineups, post touches, half-court man-to-man' },
    2023: { name: 'Mike Woodson', style: 'Two-big lineups, post touches, half-court man-to-man' },
    2024: { name: 'Mike Woodson', style: 'Inside-out scoring, isolation sets, man defense' },
    2025: { name: 'Mike Woodson', style: 'Inside-out scoring, isolation sets, man defense' },
  },
  iowa: {
    2022: { name: 'Fran McCaffery', style: 'Fast pace, high-volume offense, four-out spacing' },
    2023: { name: 'Fran McCaffery', style: 'Fast pace, high-volume offense, four-out spacing' },
    2024: { name: 'Fran McCaffery', style: 'Fast pace, perimeter-oriented offense, transition' },
    2025: { name: 'Fran McCaffery', style: 'Fast pace, perimeter-oriented offense, transition' },
  },
  maryland: {
    2022: { name: 'Danny Manning', style: 'Interim season after Turgeon departure; transitional half-court offense' },
    2023: { name: 'Kevin Willard', style: 'Defense-first, ball-screen continuity offense, deliberate' },
    2024: { name: 'Kevin Willard', style: 'Defense-first, ball-screen continuity offense, deliberate' },
    2025: { name: 'Kevin Willard', style: 'Defense-first, balanced scoring, half-court execution' },
  },
  michigan: {
    2022: { name: 'Juwan Howard', style: 'Pro-style sets, two-big spacing, half-court man defense' },
    2023: { name: 'Juwan Howard', style: 'Pro-style sets, NBA spacing concepts, man defense' },
    2024: { name: 'Juwan Howard', style: 'Pro-style sets, NBA spacing concepts, man defense' },
    2025: { name: 'Dusty May', style: 'Motion offense, analytics-driven, deep rotation, transition' },
  },
  'michigan-st': {
    2022: { name: 'Tom Izzo', style: 'Transition off rebounds, physical man defense, elite rebounding' },
    2023: { name: 'Tom Izzo', style: 'Transition off rebounds, physical man defense, elite rebounding' },
    2024: { name: 'Tom Izzo', style: 'Transition off rebounds, physical man defense, elite rebounding' },
    2025: { name: 'Tom Izzo', style: 'Transition off rebounds, physical man defense, balanced scoring' },
  },
  minnesota: {
    2022: { name: 'Ben Johnson', style: 'Ball-screen offense, switch-heavy perimeter defense' },
    2023: { name: 'Ben Johnson', style: 'Ball-screen offense, switch-heavy perimeter defense' },
    2024: { name: 'Ben Johnson', style: 'Deliberate half-court offense, man-to-man defense' },
    2025: { name: 'Ben Johnson', style: 'Deliberate half-court offense, man-to-man defense' },
  },
  nebraska: {
    2022: { name: 'Fred Hoiberg', style: 'Spread pick-and-roll, perimeter-oriented, three-point volume' },
    2023: { name: 'Fred Hoiberg', style: 'Spread pick-and-roll, perimeter-oriented, three-point volume' },
    2024: { name: 'Fred Hoiberg', style: 'Spread pick-and-roll, three-point volume, improved defense' },
    2025: { name: 'Fred Hoiberg', style: 'Spread pick-and-roll, three-point volume, improved defense' },
  },
  northwestern: {
    2022: { name: 'Chris Collins', style: 'Deliberate half-court, ball-screen offense, man / 1-3-1 mix' },
    2023: { name: 'Chris Collins', style: 'Deliberate half-court, ball-screen offense, stout man defense' },
    2024: { name: 'Chris Collins', style: 'Deliberate half-court, guard-driven offense, stout man defense' },
    2025: { name: 'Chris Collins', style: 'Deliberate half-court, guard-driven offense, stout man defense' },
  },
  'ohio-st': {
    2022: { name: 'Chris Holtmann', style: 'Ball-screen offense, switchable wings, half-court defense' },
    2023: { name: 'Chris Holtmann', style: 'Ball-screen offense, switchable wings, half-court defense' },
    2024: { name: 'Chris Holtmann', style: 'Ball-screen offense, switchable wings, half-court defense' },
    2025: { name: 'Jake Diebler', style: 'Up-tempo, perimeter-driven, improved spacing and pace' },
  },
  oregon: {
    2022: { name: 'Dana Altman', style: 'Matchup zone defense, transition offense, length-based scheme' },
    2023: { name: 'Dana Altman', style: 'Matchup zone defense, transition offense, length-based scheme' },
    2024: { name: 'Dana Altman', style: 'Matchup zone defense, transition offense, length-based scheme' },
    2025: { name: 'Dana Altman', style: 'Matchup zone defense, balanced offense, length-based scheme' },
  },
  'penn-st': {
    2022: { name: 'Micah Shrewsberry', style: 'Deliberate pace, three-point reliant offense, strong defense' },
    2023: { name: 'Micah Shrewsberry', style: 'Deliberate pace, three-point reliant offense, strong defense' },
    2024: { name: 'Mike Rhoades', style: 'Up-tempo, full-court pressure, fast pace' },
    2025: { name: 'Mike Rhoades', style: 'Up-tempo, full-court pressure, fast pace' },
  },
  purdue: {
    2022: { name: 'Matt Painter', style: 'Inside-out through the post, motion offense, drop coverage' },
    2023: { name: 'Matt Painter', style: 'Inside-out through the post, motion offense, drop coverage' },
    2024: { name: 'Matt Painter', style: 'Inside-out through the post, motion offense, drop coverage' },
    2025: { name: 'Matt Painter', style: 'Inside-out scoring, motion offense, drop coverage' },
  },
  rutgers: {
    2022: { name: 'Steve Pikiell', style: 'Grind-it-out defense, low tempo, offensive rebounding' },
    2023: { name: 'Steve Pikiell', style: 'Grind-it-out defense, low tempo, offensive rebounding' },
    2024: { name: 'Steve Pikiell', style: 'Grind-it-out defense, low tempo, offensive rebounding' },
    2025: { name: 'Steve Pikiell', style: 'Defense-first, low tempo, young perimeter talent' },
  },
  ucla: {
    2022: { name: 'Mick Cronin', style: 'Defense-first, deliberate half-court, physical man-to-man' },
    2023: { name: 'Mick Cronin', style: 'Defense-first, deliberate half-court, physical man-to-man' },
    2024: { name: 'Mick Cronin', style: 'Defense-first, deliberate half-court, physical man-to-man' },
    2025: { name: 'Mick Cronin', style: 'Defense-first, deliberate half-court, physical man-to-man' },
  },
  usc: {
    2022: { name: 'Andy Enfield', style: 'Length and athleticism, transition offense, zone mix' },
    2023: { name: 'Andy Enfield', style: 'Length and athleticism, transition offense, zone mix' },
    2024: { name: 'Andy Enfield', style: 'Length and athleticism, transition offense, zone mix' },
    2025: { name: 'Eric Musselman', style: 'Up-tempo, four-out spacing, aggressive defense' },
  },
  washington: {
    2022: { name: 'Mike Hopkins', style: '2-3 zone defense, deliberate half-court offense' },
    2023: { name: 'Mike Hopkins', style: '2-3 zone defense, deliberate half-court offense' },
    2024: { name: 'Mike Hopkins', style: '2-3 zone defense, deliberate half-court offense' },
    2025: { name: 'Danny Sprinkle', style: 'Man-to-man defense, balanced offense, disciplined execution' },
  },
  wisconsin: {
    2022: { name: 'Greg Gard', style: 'Swing offense, low tempo, pack-line-influenced defense' },
    2023: { name: 'Greg Gard', style: 'Swing offense, low tempo, pack-line-influenced defense' },
    2024: { name: 'Greg Gard', style: 'Modernized swing offense, faster pace, man defense' },
    2025: { name: 'Greg Gard', style: 'Modernized swing offense, faster pace, man defense' },
  },
}

export function getCoach(school, year) {
  const hit = COACH_META[school]?.[year]
  if (!hit) return { name: 'Unknown', style: 'No data available', approximate: false, missing: true }
  // Flag the result as approximate so the UI can render an annotation.
  return { ...hit, approximate: COACH_META_INFO.approximate, missing: false }
}
