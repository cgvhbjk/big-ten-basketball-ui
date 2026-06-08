// Central configuration for the EPA modeling system.
// Change model behavior here — not in individual files.

// teamSeasons.json column → model feature name mapping
export const FIELD_MAP = {
  // Four-factor offensive predictors
  off_eFG: 'efg_o',
  off_TOV: 'tov_o',
  off_ORB: 'orb',
  off_FTR: 'ftr_o',
  // Four-factor defensive predictors
  def_eFG: 'efg_d',
  def_TOV: 'tov_d',
  def_ORB: 'drb',
  def_FTR: 'ftr_d',
  // Efficiency targets
  adjOE:    'adjoe',
  adjDE:    'adjde',
  rawOE:    'ppp',
  rawDE:    'opp_ppp',
  netAdj:   'net_efficiency',
  netRaw:   'net_ppp',
  ftPct:    'ft_pct',
}

// Sign constraints for the per-game four-factor model, predicting net
// efficiency = (pts − opp_pts) per 100 possessions. The factors are computed
// from box scores in standard (textbook) direction: TOV% = turnovers/poss
// (higher is worse), ORB% = offensive-rebound rate (higher is better), and so
// on. These are the signs the n≈2,461 Big Ten per-game fit returns; checkSigns
// flags any coefficient that comes back against them (a data/encoding problem,
// not small-sample noise — at this sample size all eight are stable).
export const SIGN_CONSTRAINTS = {
  off_eFG:  1,   // more eFG%               → higher net
  off_TOV: -1,   // more turnovers          → lower net
  off_ORB:  1,   // more offensive rebounds → higher net
  off_FTR:  1,   // more free-throw rate    → higher net
  def_eFG: -1,   // more opponent eFG%      → lower net
  def_TOV:  1,   // more opponent turnovers → higher net
  def_ORB: -1,   // more opponent off. reb. → lower net
  def_FTR: -1,   // more opponent FT rate   → lower net
}

// Default pipeline configuration
export const DEFAULT_CONFIG = {
  // 'raw': use ppp/opp_ppp targets (no adjusted/raw mismatch)
  // 'adjusted': use adjoe/adjde targets (logs mismatch warning)
  targetMode: 'raw',

  // Default model: 'ridge_split' — separate off/def ridge models with LOO-CV alpha
  // Alternatives: 'ols_joint', 'ridge_joint', 'constrained_ols'
  preferredModel: 'ridge_split',

  ridge: {
    // Candidate alpha values for LOO-CV grid search
    alphas: [0.001, 0.01, 0.1, 1, 10, 100, 1000],
    // 'loo' = leave-one-out (best for n=32), or an integer k for k-fold
    cvFolds: 'loo',
    standardize: true,
  },

  interactions: {
    // Never enable by default with n=32 — increases predictor count
    enabled: false,
    terms: [['off_eFG', 'off_TOV'], ['def_eFG', 'def_TOV'], ['off_eFG', 'off_ORB']],
  },

  diagnostics: {
    vifWarnThreshold:  5,
    vifErrorThreshold: 10,
    minObsPerPredictor: 10,
  },
}

// Named constants — no magic numbers elsewhere
export const POSSESSION_VALUE_SCALE = 100  // everything is per 100 possessions
export const ORB_POSSESSION_CREDIT  = 0.85  // offensive rebound gives ~85% of a full possession
export const THREE_PT_eFG_MULTIPLIER = 1.5  // 3FG worth 1.5× a 2FG in eFG terms

// Sub-factor feature flag.
// When enabled, splits aggregate four factors into live/dead and putback/reset.
// Requires additional columns in teamSeasons.json (not yet available from Barttorvik).
// With Ridge regularization the model handles 12 predictors fine once data exists.
export const SUBFACTORS = {
  enabled: false,   // flip to true once data columns are available
  available: false, // set to true when teamSeasons.json includes these fields

  // Column names expected in the data when enabled
  columns: {
    off_LiveTOV:     null,   // live-ball turnover rate — not yet in data
    off_DeadTOV:     null,   // dead-ball turnover rate — not yet in data
    off_ORB_putback: null,   // putback offensive rebound rate — not yet in data
    off_ORB_reset:   null,   // reset offensive rebound rate — not yet in data
  },

  // These replace the current off_TOV and off_ORB in the feature matrix when enabled
  replaces: {
    off_TOV: ['off_LiveTOV', 'off_DeadTOV'],
    off_ORB: ['off_ORB_putback', 'off_ORB_reset'],
  },
}

// Model display metadata for the UI
export const MODEL_LABELS = {
  ols_joint:        'OLS (joint 8-predictor)',
  ridge_joint:      'Ridge (joint, CV α)',
  ridge_split:      'Ridge Split (off+def, CV α)',
  constrained_ols:  'Constrained OLS (sign-enforced)',
}

// One-sentence plain-English description per model — used as hover tooltips
// in the comparison table so a user without statistics background can tell
// what each model actually does.
export const MODEL_DESCRIPTIONS = {
  ols_joint:        'Standard regression on all 8 factors at once. No regularization, no shrinkage — the textbook fit.',
  ridge_joint:      'Same 8-factor fit, but penalizes large coefficients to handle small samples. Penalty strength chosen by cross-validation.',
  ridge_split:      'Fits offense and defense as two separate 4-predictor models — predicts ppp and opp_ppp directly. Avoids the small-sample noise that flips signs in the joint models.',
  constrained_ols:  'Forces every coefficient to match the empirically-verified sign from the Phase-0 audit. Wrong-signed coefficients get clipped to exactly zero. This is the model whose values feed the displayed event EPA.',
}
