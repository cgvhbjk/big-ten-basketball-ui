# Big Ten Basketball Analytics

A React web app for exploring Big Ten men's basketball data (2022–2025). Built on Barttorvik team and player statistics, it surfaces metric correlations, playing-style archetypes, roster composition insights, and individual player power ratings across the conference.

> **Conference scope.** This is the 18-team Big Ten after the 2024–25 realignment. The four West-Coast newcomers — UCLA, USC, Oregon, Washington — only carry Big Ten data from the 2025 season (they were Pac-12 before), so their earlier seasons are intentionally absent. Membership each season is taken from Barttorvik's conference code, so the panel is naturally 14 teams in 2022–24 and 18 in 2025.

## Pages

The app has **two routes**, `/teams` and `/players`. Older deep-links
(`/analyzer`, `/insights`, `/epa`) redirect to `/teams`.

### Teams (`/teams`)
A hub with three tabbed sub-views:

- **Matchup** — head-to-head projections using adjusted efficiency margins and a win-probability model fit on conference game results, with a four-factors radar, position-edge breakdown, scheme summary, and roster comparison.
- **Insights** — four analysis modes:
  - *Metric Correlation* — scatter any two team metrics. Shows Pearson r, a bootstrap CI and permutation p-value, a regression line, automatic threshold detection (best split point on the x-axis), time-window stability, and style-interaction breakdowns by tempo or 3-point-rate tercile.
  - *FDR Scan* — sweeps many metric pairs and applies Benjamini–Hochberg false-discovery-rate correction so "significant" hits survive multiple testing.
  - *Scheme Analysis* — classifies every team-season into offensive archetypes (Run & Gun / Transition Attack / Spread Offense / Grind It Out) and defensive archetypes (High Pressure / Rim Protection / Coverage / Standard), then compares any outcome across schemes. Cut-points self-calibrate to the loaded distribution; an empirical k-means clustering is also provided.
  - *Roster & Bio* — minute-weighted team biodata aggregates (avg height, class-year experience, % guard/forward/big minutes) scattered against any outcome metric, plus a player-level biodata scatter.
- **EPA Models** — Expected Points Added from a four-factor regression pipeline (OLS, cross-validated ridge, split ridge, sign-constrained NNLS) with automatic model selection and diagnostics. See `EPA_MODELS.md`.

### Players (`/players`)
Three tabs:

- **Profile** — player selector with a radar normalized within the selected year's league pool, full efficiency stats, and a side-by-side comparison with any other school/year.
- **Positions** — average stats by Barttorvik position type with a dual-axis bar chart (ORTG left axis, Pts/G right axis).
- **Training Plan** — position-specific NBA-combine target ranges, gap analysis against entered measurements, a prioritized strength-&-conditioning plan, and NBA comparables.

> **Implemented but not yet surfaced in the UI.** The repo ships two finished,
> unit-tested analytics engines that no current route renders: lineup-adjusted
> player **power ratings** (`src/utils/powerRating.js`, methodology below) and
> **Pythagorean record-luck** (`src/utils/calibration.js`). They're exercised by
> the precompute step and the test suite but are not wired into a page.

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
