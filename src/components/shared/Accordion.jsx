import { useState, useId } from 'react'
import { T } from '../../styles/theme.js'

// Accordion — the app's primary progressive-disclosure primitive. Advanced /
// secondary stats live behind these so the default view stays scannable.
// Accessibility: the trigger is a real <button> with aria-expanded and
// aria-controls; the revealed region is linked back via aria-labelledby.
export default function Accordion({ title, defaultOpen = false, badge, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const panelId = `acc-panel-${id}`
  const btnId = `acc-btn-${id}`

  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      <button
        id={btnId}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px', background: open ? T.surf2 : T.surf, border: 'none', cursor: 'pointer',
          color: T.text, fontSize: 13, fontWeight: 600, textAlign: 'left',
          transition: 'background .15s', fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {badge && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
              background: `${T.accent}22`, color: T.accentSoft,
            }}>
              {badge}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          style={{
            fontSize: 10, color: open ? T.accentSoft : T.textLow, transition: 'transform .2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={btnId}
          style={{ padding: '14px 16px', background: T.surf, borderTop: `1px solid ${T.border}` }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
