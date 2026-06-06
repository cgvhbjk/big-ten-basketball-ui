import { useRef } from 'react'
import { T, TAB } from '../../styles/theme.js'

// SectionTabs — an accessible tab strip used for the in-page section switchers
// (Overview / Positions / Roster …). Replaces the ad-hoc rows of plain buttons
// that each page rolled by hand, which were not keyboard-operable as a group.
//
// Implements the WAI-ARIA tabs pattern:
//   • container role="tablist"
//   • each control role="tab" with aria-selected
//   • Left/Right (and Home/End) arrow keys move between tabs
//   • only the active tab is in the Tab order (roving tabindex)
//
// Props:
//   tabs     — [{ value, label, badge? }]
//   value    — currently selected value
//   onChange — (value) => void
//   ariaLabel — accessible name for the tablist (e.g. "Matchup sections")
export default function SectionTabs({ tabs, value, onChange, ariaLabel = 'Sections', style }) {
  const refs = useRef([])

  function focusTab(i) {
    const t = tabs[i]
    if (!t) return
    onChange(t.value)
    refs.current[i]?.focus()
  }

  function onKeyDown(e, idx) {
    const last = tabs.length - 1
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = idx === last ? 0 : idx + 1
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = idx === 0 ? last : idx - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = last
    if (next !== null) {
      e.preventDefault()
      focusTab(next)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{ display: 'flex', gap: 4, flexWrap: 'wrap', ...style }}
    >
      {tabs.map((t, i) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            ref={el => (refs.current[i] = el)}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={e => onKeyDown(e, i)}
            style={{ ...TAB(active), display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            {t.label}
            {t.badge != null && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999,
                background: active ? `${T.accent}33` : T.surf2,
                color: active ? T.accentSoft : T.textLow,
              }}>
                {t.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
