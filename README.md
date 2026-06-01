# Big Ten Basketball Analytics

A React web app for exploring Big Ten men's basketball data (2022–2025). Built on Barttorvik team and player statistics, it surfaces metric correlations, playing-style archetypes, roster composition insights, and individual player power ratings across the conference.

> **Conference scope.** This is the 18-team Big Ten after the 2024–25 realignment. The four West-Coast newcomers — UCLA, USC, Oregon, Washington — only carry Big Ten data from the 2025 season (they were Pac-12 before), so their earlier seasons are intentionally absent. Membership each season is taken from Barttorvik's conference code, so the panel is naturally 14 teams in 2022–24 and 18 in 2025.

## Pages

### Matchup Analyzer (`/analyzer`)
Head-to-head matchup projections using adjusted efficiency margins and a win-probability model fit on conference game results.

### Insights Lab (`/insights`)
Three analysis modes on one page:

- **Metric Correlation** — scatter any two team metrics across all team-seasons. Shows Pearson r, regression line, automatic threshold detection (best split point on the x-axis), time-window stability, and style-interaction breakdowns by tempo or 3-point-rate tercile.
- **Scheme Analysis** — classifies every team-season into offensive archetypes (Run & Gun / Transition Attack / Spread Offense / Grind It Out) and defensive archetypes (High Pressure / Rim Protection / Coverage / Standard), then compares any outcome metric across schemes. Scheme cut-points are derived from the loaded conference distribution, so they self-calibrate to the data.
- **Roster & Bio** — aggregates per-player biodata (avg height, avg class-year experience, % guards/forwards/bigs) to the team-season level and scatters against any outcome metric. A second panel scatters individual player biodata against any per-game stat.

### Player Lab (`/players`)
Three tabs:

- **Profile** — player selector with radar chart normalized within the league pool for the selected year, full efficiency stats, and a side-by-side roster comparison with any other school/year.
- **Power Rank** — conference-wide leaderboard using lineup-adjusted power ratings (see below).
- **Positions** — average stats by Barttorvik position type with dual-axis bar chart (ORTG left axis, Pts/G right axis).

### EPA Lab (`/epa`) & Luck Lab (`/luck`)
Expected Points Added from regression on the Dean Oliver four factors, and Pythagorean win-expectation vs. actual wins.

## Power Rating Methodology

Player power ratings use ordinary least squares on team net efficiency. For each team-season the pipeline computes minute-weighted averages of each player's centered ORTG and DRTG (centered = individual minus the league-wide average for that year). OLS regresses team `adjoe − adjde` on those two weighted features to learn `β_ortg` and `β_drtg`. Each player's rating is then:

```
power_rating = β_ortg × (ORTG − avg) × min_share
             + β_drtg × (DRTG − avg) × min_share
```

Because Barttorvik's ORTG/DRTG are already lineup-adjusted, the ratings implicitly capture spacing, screening, and off-ball contributions that show up in margin when a player is on the floor.

## Data setup

The app reads bundled JSON in `src/data/`. Regenerate it from source with:

```bash
npm install
npm run fetch-data     # Barttorvik team + player stats  → teamSeasons.json, players.json
npm run fetch-games    # ESPN schedules + scores         → games.json
npm run fetch-d1       # D1-wide four factors (EPA train) → d1TeamSeasons.json
npm run precompute     # re-fit win model / Pythagorean / EPA coefficients
# optional, slow (~10-20 min): per-game box scores for Tier-2 EPA
npm run fetch-gamelogs
```

`fetch-games`/`fetch-gamelogs` read `teamSeasons.json` for conference membership, so run `fetch-data` first. `precompute` is deterministic in the data files and re-runs whenever they change.

> **Note:** Barttorvik (an AWS-WAF-fronted site) blocks some networks/IPs with a 403. If `fetch-data` fails with HTTP 403, run it from a different network. ESPN-based `fetch-games` is unaffected.

## Tech Stack

| Layer | Library |
|---|---|
| UI | React 18 + Vite |
| Charts | Recharts |
| State | Zustand |
| Styling | Tailwind CSS + inline styles |

## Data

All statistics sourced from [Barttorvik](https://barttorvik.com) (team/player) and [ESPN](https://espn.com) (game scores).

**Team metrics:** adjusted offensive/defensive efficiency, four factors (eFG%, TOV%, ORB%, FT rate for both offense and defense), shooting splits (2P%, 3P%, 3PA rate), FT%, tempo, net efficiency, predictive win% (barthag).

**Player metrics:** per-game counting stats, eFG%, true shooting%, usage%, BPM, ORTG/DRTG, offensive/defensive rebound rate, assist rate, height (parsed to inches), class year (converted to 1–5 experience scale).

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5174`.

## Schools Covered

Illinois · Indiana · Iowa · Maryland · Michigan · Michigan State · Minnesota · Nebraska · Northwestern · Ohio State · Oregon · Penn State · Purdue · Rutgers · UCLA · USC · Washington · Wisconsin
