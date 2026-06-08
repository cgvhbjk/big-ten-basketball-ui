# EPA Models — Developer Guide

## Quick start

```bash
# Run the test suite (no framework needed)
node scripts/test-epa-models.mjs

# Start the dev server
npm run dev
# → open http://localhost:5174, click "EPA Lab"
```

---

## Architecture

```
src/utils/epaModels/
  config.js        — constants, field mappings, sign constraints, defaults
  matrixOps.js     — OLS, ridge solve, matrix inverse, NNLS active-set
  validate.js      — input validation, adjusted/raw mismatch detection
  features.js      — feature extraction, standardization, matrix builders
  models.js        — fitOLS, fitRidge, fitRidgeCV, fitSplitRidgeCV, fitConstrained
  diagnostics.js   — VIF, correlation matrix, coefficient stability, residuals
  epaConversion.js — league-rate derivation, event EPA conversion with documented assumptions
  pipeline.js      — main orchestrator (Tier 1 / team-season)
  tier2.js         — Tier 2 orchestrator (game-log)
  index.js         — public exports
```

---

## What changed vs. the old approach

| Problem | Old | New |
|---|---|---|
| Too many predictors | 8 predictors fit jointly | Split models: 4 predictors each (halves the predictor load per fit) |
| Coefficient instability | Plain OLS | Ridge with LOO-CV alpha selection |
| Sign flips | Undetected | Checked against `SIGN_CONSTRAINTS`; constrained model selected when signs are wrong |
| Adjusted/raw mismatch | Silent | Validated + warning logged; default is `targetMode: 'raw'` |
| Hard-coded FGA=48 | Wrong by ~1.8× | Derived from data via scoring identity: `ppp = FGA_p100 × (2·eFG + ft_pct·ftr)` |
| Synthetic Tier 2 as real | Silent | `synthetic: true` flag always set; UI shows SYNTHETIC badge |
| No model comparison | — | All 4 models compared by LOO-CV R², sign correctness, RMSE |
| No diagnostics | — | VIF, correlation matrix, CV stability, residuals |

---

## Model selection logic

The pipeline fits four models and selects in this priority order:

1. **Ridge split** — if all coefficient signs are correct  
2. **Constrained OLS** — if ridge split has sign issues (NNLS enforces theory)  
3. **Ridge joint** — fallback  
4. **OLS joint** — baseline only, never selected

Current default output: **Ridge split**. On the refreshed 2022–2026 data (n=78 conference team-seasons) all eight coefficient signs come back correct, so the ridge-split model is selected and the sign-enforced constrained model is not needed as the default — it remains the fallback if a future data refresh flips a sign. (The `tov_o` / `orb` columns still use Barttorvik's non-standard encoding direction; that's captured in the sign constraints, not a defect.)

---

## Field encoding (Phase 0 — VERIFIED)

The directional encoding of four columns from Barttorvik's slice JSON was historically ambiguous. The Phase-0 audit (`src/utils/epaModels/encodingAudit.js`) resolves this empirically — it fits a four-factor OLS on the the conference team-seasons and reports the partial coefficient signs. The unit test at `src/utils/epaModels/__tests__/encodingAudit.test.js` locks these signs in CI.

### Empirical regression (n=78 conference team-seasons, standardized X)

_Figures below were refreshed on the 2022–2026 data (76 of 78 team-seasons have complete four-factor rows; D1 training set n=1,812). Magnitudes shift slightly with each data refresh; the **signs** are what the constraints lock._

**Offense → ppp** (R²=0.96):

| Field | β   | Sign | Note |
|---|----:|:---:|---|
| `efg_o` | +3.99 | + | Standard convention; matches textbook. |
| `tov_o` | +0.66 | **+** | Opposite of textbook — likely a percentile-rank-where-higher-is-better encoding (high `tov_o` ⇒ low actual TOV%). |
| `orb`   | −2.73 | **−** | Opposite of textbook — encoding is opposite-direction to standard ORB%. |
| `ftr_o` | +2.74 | + | Standard. |

**Defense → opp_ppp** (R²=0.95):

| Field | β   | Sign | Note |
|---|----:|:---:|---|
| `efg_d` | +3.40 | + | Standard. |
| `tov_d` | +0.94 | + | Positive and stable on the larger sample — the audit no longer flags it (it was effectively zero / low-confidence at the old n≈32–60). Still the smallest defensive coefficient. |
| `drb`   | −2.82 | − | Standard — own DRB% reduces opp scoring. |
| `ftr_d` | +1.79 | + | Standard. |

### What the locked signs mean for the pipeline

The verification result is encoded in three constraint dictionaries (all in `config.js`):

```js
SIGN_CONSTRAINTS_OFF = { off_eFG: 1, off_TOV: 1, off_ORB: -1, off_FTR: 1 }
SIGN_CONSTRAINTS_DEF = { def_eFG: 1, def_TOV: 1, def_ORB: -1, def_FTR: 1 }
SIGN_CONSTRAINTS     = { ...OFF, def_eFG: -1, def_TOV: -1, def_ORB: 1, def_FTR: -1 }   // joint, defensive flips
```

Three signs differ from textbook convention: `off_TOV: +1` (was −1), `off_ORB: −1` (was +1), `def_ORB: +1` in the joint dict (was −1). These mismatches were silently producing wrong-signed coefficients in the constrained model before Phase 0.

### Why we still need the modeling complexity

Phase 0 originally hypothesized that fixing the encoding would let us retire `constrained_ols` and the dual-variant logic in `convertToEventEPA`. On the refreshed 2022–2026 data that largely holds: the **sign ambiguity is gone**, and at n=78 ridge-split returns all eight signs correctly (including a clean, stable positive `def_TOV`), so ridge-split is now the selected model. The constrained model and the model-comparison logic stay as a **safety net** — if a future refresh flips a sign, the pipeline falls back to the sign-enforced fit automatically — but day-to-day output no longer depends on it.

**Recommendation for future data refreshes**: run `npm test` after refreshing `teamSeasons.json`. If the encoding audit fails, the refresh introduced an encoding flip — investigate before merging.

---

## EPA conversion

Old: `made2FG = β_eFG × (100 / 48)` — used average FGA *per game* as if it were per 100 possessions.

New:
```
FGA_p100 = ppp / (2 × eFG + ft_pct × ftr)   ← accounting identity
made2FG  = β_eFG × (100 / FGA_p100)
made3FG  = β_eFG × (100 / FGA_p100) × 1.5
```

League-average `FGA_p100 = 87.9` (derived from the conference team-seasons, recomputed at runtime). The old 48 was wrong by 1.8×.

---

## Switching target mode

```js
import { runEPAPipeline } from './src/utils/epaModels/pipeline.js'

// Default: raw targets (ppp, opp_ppp) — no adjusted/raw mismatch
const result = runEPAPipeline(teamSeasons, { targetMode: 'raw' })

// Adjusted targets (adjoe, adjde) — logs mismatch warning
const result2 = runEPAPipeline(teamSeasons, { targetMode: 'adjusted' })
```

---

## Adding real game-log data (Tier 2)

Replace `src/data/gameLogs.json` with real Barttorvik per-game box scores. Each row must include:

```
school, year, date, opponent, is_conf_opponent, location,
pts, fgm, fga, fg3m, fg3a, ftm, fta, orb, drb, tov,
opp_pts, opp_fgm, opp_fga, opp_fg3m, opp_fg3a, opp_ftm, opp_fta,
opp_orb, opp_drb, opp_tov
```

The `synthetic` flag will clear automatically once real data is present (detection checks for `game_id` or `source` fields).

---

## What would most improve the model

1. **More seasons** — the D1 training set now spans 2022–2026 (n=1,812); extending further back would add coefficient stability
2. **Monitor field encoding** — the Phase-0 audit locks the four non-standard signs (`tov_o`, `orb`, `tov_d`, `drb`) in CI; re-confirm only if a refresh trips the audit test
3. **Real game-log data** — Tier 2 is currently synthetic; per-game box scores unlock possession-level analysis
4. **Possession-level data** — each possession is one observation; thousands of rows make all models stable
