// Lock the Phase-0 encoding verification: the four-factor partial signs
// observed in the team-season data must match the sign constraints the EPA
// pipeline ships. If a data refresh re-encodes a column in the opposite
// direction, this test fails — surfacing a silent regression that would
// otherwise produce wrong-signed EPA coefficients.

import { describe, expect, it } from 'vitest'
import { auditFieldEncoding, diffAgainstShippedConstraints } from '../encodingAudit.js'
import { SIGN_CONSTRAINTS, SIGN_CONSTRAINTS_OFF, SIGN_CONSTRAINTS_DEF } from '../config.js'
import teamSeasons from '../../../data/teamSeasons.json'

describe('Field encoding audit (Phase 0)', () => {
  const audit = auditFieldEncoding(teamSeasons)

  it('runs with at least 12 valid rows (real conference data)', () => {
    expect(audit.ok).toBe(true)
    expect(audit.n).toBeGreaterThanOrEqual(12)
  })

  it('offense fit explains a substantial share of ppp variance (R² ≥ 0.80)', () => {
    expect(audit.off.r2).toBeGreaterThanOrEqual(0.80)
  })

  it('defense fit explains a substantial share of opp_ppp variance (R² ≥ 0.70)', () => {
    expect(audit.def.r2).toBeGreaterThanOrEqual(0.70)
  })

  it('locked offensive signs: efg+, tov+, orb−, ftr+', () => {
    expect(audit.off.signs).toEqual({
      off_eFG: 1, off_TOV: 1, off_ORB: -1, off_FTR: 1,
    })
  })

  it('locked defensive signs: efg+, tov+ (low-confidence), drb−, ftr+', () => {
    expect(audit.def.signs).toEqual({
      def_eFG: 1, def_TOV: 1, def_ORB: -1, def_FTR: 1,
    })
  })

  it('shipped constraints match the audit (no silent encoding drift)', () => {
    const diffs = diffAgainstShippedConstraints(audit, {
      SIGN_CONSTRAINTS_OFF,
      SIGN_CONSTRAINTS_DEF,
      // CONSTRAINED_SIGNS is the joint-model dictionary; we ship the same
      // dictionary as `SIGN_CONSTRAINTS` since pipeline.js now reuses it.
      CONSTRAINED_SIGNS: SIGN_CONSTRAINTS,
    })
    if (diffs.length) {
      // Fail with a readable diff so anyone running tests sees exactly which
      // sign changed and where.
      const lines = diffs.map(d => `  ${d.dict}.${d.field}: shipped=${d.shipped}, audit=${d.audit}`)
      throw new Error(`Encoding audit disagrees with shipped sign constraints:\n${lines.join('\n')}`)
    }
    expect(diffs).toEqual([])
  })

  it('flags low-signal coefficients (|β| < 0.3) and only those', () => {
    // The audit warns on near-zero coefficients whose sign isn't strongly
    // identified. *Which* coefficients those are depends on the loaded data —
    // at the Ivy baseline (n≈32) def_TOV was flagged; the richer Big Ten data
    // (n=60) estimates it cleanly — so assert the invariant rather than a
    // dataset-specific field: a warning exists for a coefficient iff |β| < 0.3.
    const OFF = ['off_eFG', 'off_TOV', 'off_ORB', 'off_FTR']
    const DEF = ['def_eFG', 'def_TOV', 'def_ORB', 'def_FTR']
    const expected = new Set()
    OFF.forEach((k, i) => { if (Math.abs(audit.off.beta[i + 1]) < 0.3) expected.add(`off/${k}`) })
    DEF.forEach((k, i) => { if (Math.abs(audit.def.beta[i + 1]) < 0.3) expected.add(`def/${k}`) })

    // every warning maps to a genuinely low-|β| coefficient …
    for (const w of audit.warnings) {
      expect(expected.has(w.split(':')[0])).toBe(true)
    }
    // … and every low-|β| coefficient produced exactly one warning.
    expect(audit.warnings.length).toBe(expected.size)
  })
})
