# EPA Models — Developer Guide

## Quick start

```bash
# Run the standalone test suite (no framework needed)
node scripts/test-epa-models.mjs

# Start the dev server
npm run dev
# → open http://localhost:5174, click Teams → EPA Models
```

---

## What the model is

A **single four-factor regression** that predicts net efficiency (points − opponent
points, per 100 possessions) from the eight Dean Oliver factors, fit on **real
Big Ten per-game box scores** (`src/data/gameLogs.json`, ESPN, ~2,461 games,
2022–2026). The fitted coefficients are converted into per-event "Expected Points
Added" values (made 2FG, made 3FG, turnover, offensive rebound, foul drawn,
forced turnover, shot suppression).

```
net_eff ~ off_eFG + off_TOV + off_ORB + off_FTR
        + def_eFG + def_TOV + def_ORB + def_FTR
```

### Why per-game, and why only one model

Earlier versions ran **two tiers** (season-aggregate + per-game) plus a **D1-wide
training crutch** (`d1TeamSeasons.json`, n≈1,800). That apparatus existed because
conference-only season data was too small (n≈78, and far worse in the Ivy sibling
repo at 8 teams): TOV% and ORB% are collinear with eFG% at that sample size, so
the coefficients were unstable and needed sign constraints / a larger external
corpus to behave.

With ~2,461 real Big Ten box scores that's no longer true. The per-game fit is

- **R² ≈ 0.98, CV R² ≈ 0.98** (10-fold), and
- **all VIFs ≈ 1** — game-level variance breaks the season-level collinearity, so
- **all eight coefficients come back stable and textbook-signed** with no
  constraints and no external data.

So the tiers and the D1 corpus were retired; everything is derived from Big Ten
data alone.

---

## Architecture

```
src/utils/epaModels/
  config.js        — constants, field mappings, textbook SIGN_CONSTRAINTS
  matrixOps.js     — OLS, ridge solve, matrix inverse, NNLS active-set
  validate.js      — input validation (team-seasons + game logs)
  features.js      — feature names, matrix builders, standardization
  models.js        — fitRidgeCV (the fitter used), plus fitOLS / fitConstrained helpers
  diagnostics.js   — VIF, correlation matrix, CV-fold coefficient stability
  epaConversion.js — league-rate derivation + event-EPA conversion
  pipeline.js      — runEPAPipeline(gameLogs, teamSeasons, opts) + game-factor helpers
  index.js         — public exports
```

`runEPAPipeline` is the single entry point. `teamSeasons` is passed only to derive
the league-average FGA/100 denominator for the EPA conversion (its eFG/FTR/FT%/ppp
fields are encoding-neutral).

---

## Encoding (important)

The per-game four factors are computed from box scores in **standard / textbook
direction**: `TOV% = turnovers / possessions` (higher is worse), `ORB% =
offensive-rebound rate` (higher is better), etc. So the coefficients read
naturally and `SIGN_CONSTRAINTS` (in `config.js`) are the plain textbook signs:

```js
SIGN_CONSTRAINTS = {
  off_eFG: +1, off_TOV: -1, off_ORB: +1, off_FTR: +1,
  def_eFG: -1, def_TOV: +1, def_ORB: -1, def_FTR: -1,
}
```

> **Historical note.** The retired team-season path read Barttorvik's slice JSON,
> whose `tov_o`/`orb` columns used a *non-textbook* direction, so the old sign
> constraints and the event-EPA conversion had to negate `off_TOV`/`off_ORB`.
> `convertToEventEPA` still accepts `{ encoding: 'barttorvik' }` for that legacy
> direction, but the pipeline always calls it with `encoding: 'textbook'`.

`checkSigns` flags any coefficient that comes back against these signs — at this
sample size that would indicate a data problem, not small-sample noise.

---

## EPA conversion

Coefficients are per-100-possession; per-event values divide by the league-average
FGA per 100 possessions, derived from the scoring identity rather than a hard-coded
constant:

```
FGA_p100 = ppp / (2 × eFG + ft_pct × ftr)     ← accounting identity
made2FG  = β_eFG × (100 / FGA_p100)
made3FG  = β_eFG × (100 / FGA_p100) × 1.5
```

League-average `FGA_p100 ≈ 88.7` (from the conference team-seasons, recomputed at
runtime). When `baseline_epa.json` is supplied, the conversion also produces
state-contextualized Base + Delta values (see `epaConversion.js`).

---

## Adding real / refreshed game-log data

`gameLogs.json` rows must include:

```
school, year, date, opponent, is_conf_opponent, location,
pts, fgm, fga, fg3m, fg3a, ftm, fta, orb, drb, tov,
opp_pts, opp_fgm, opp_fga, opp_fg3m, opp_fg3a, opp_ftm, opp_fta,
opp_orb, opp_drb, opp_tov
```

Regenerate with `npm run fetch-gamelogs` (ESPN, ~10–20 min). `validate.js` flags a
dataset as synthetic/placeholder if it has no source fields **or** no nonzero
scoring (e.g. all points zeroed), which suppresses it from being treated as a real
fit.

---

## What would most improve the model

1. **Possession-level data** — each possession as one observation would sharpen the
   four-factor estimates further.
2. **More seasons** — additional years of box scores add coefficient stability.
3. **Sub-factor splits** — live/dead turnovers, putback/reset rebounds (see the
   `SUBFACTORS` flag in `config.js`) once those columns are available per game.
