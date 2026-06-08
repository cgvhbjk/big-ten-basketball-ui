import { describe, it, expect } from 'vitest'
import {
  relativeLuminance, isDarkColor, markStroke, radarDot, textHaloShadow, resolveTeamColor,
} from '../teamColor.js'
import { SCHOOL_COLORS } from '../../data/constants.js'

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })
  it('orders dark below light (Michigan navy < Iowa gold)', () => {
    expect(relativeLuminance('#00274C')).toBeLessThan(relativeLuminance('#C8A415'))
  })
  it('returns 1 (treated as light) for invalid input', () => {
    expect(relativeLuminance(undefined)).toBe(1)
    expect(relativeLuminance('not-a-color')).toBe(1)
  })
})

describe('isDarkColor', () => {
  it('flags genuinely dark brand colors', () => {
    expect(isDarkColor(SCHOOL_COLORS.michigan)).toBe(true)   // navy
    expect(isDarkColor(SCHOOL_COLORS.oregon)).toBe(true)     // dark green
    expect(isDarkColor(SCHOOL_COLORS.indiana)).toBe(true)    // dark red
  })
  it('does not flag bright brand colors', () => {
    expect(isDarkColor(SCHOOL_COLORS.iowa)).toBe(false)      // gold
    expect(isDarkColor(SCHOOL_COLORS.illinois)).toBe(false)  // orange
    expect(isDarkColor(SCHOOL_COLORS.maryland)).toBe(false)  // bright red
  })
})

describe('outline helpers', () => {
  it('uses a light stroke for dark marks and a dark stroke for light marks', () => {
    expect(markStroke('#00274C').stroke).toBe('#e8e8e8')
    expect(markStroke('#C8A415').stroke).toBe('#0e0e0e')
  })
  it('returns outlined radar dots only for dark colors', () => {
    expect(radarDot('#00274C')).toMatchObject({ stroke: '#fff' })
    expect(radarDot('#C8A415')).toBe(false)
  })
  it('emits a text halo only for dark colors', () => {
    expect(textHaloShadow('#00274C')).not.toBe('none')
    expect(textHaloShadow('#C8A415')).toBe('none')
  })
})

describe('resolveTeamColor', () => {
  it('applies an override when present, else the brand color', () => {
    expect(resolveTeamColor('michigan')).toBe('#274C77')   // overridden
    expect(resolveTeamColor('purdue')).toBe(SCHOOL_COLORS.purdue)
  })
  it('falls back for unknown schools', () => {
    expect(resolveTeamColor('nowhere', '#123456')).toBe('#123456')
  })
})
