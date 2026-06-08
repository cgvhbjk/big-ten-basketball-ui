import { useState, useRef, useEffect, useId } from 'react'

// Small, dependency-free info affordance: an (i) icon next to a label that
// reveals a short explanation on hover OR keyboard focus. Modeled on the
// accessible pattern in shared/GlossaryTooltip.jsx, but takes free-text props
// instead of a glossary key so it can annotate any label.
//
//   <InfoTooltip label="Net Efficiency" text="Offense minus defense…" />
//
// Accessibility: the trigger is a real <button> (Tab-reachable), carries an
// aria-label, links the popup via aria-describedby, and closes on blur/Escape.
export default function InfoTooltip({ label, text, align = 'left' }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  const tipId = useId()

  useEffect(() => {
    if (!show) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false)
    }
    function onKey(e) { if (e.key === 'Escape') setShow(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [show])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(s => !s)}
        aria-label={label ? `What is ${label}?` : 'More information'}
        aria-expanded={show}
        aria-describedby={show ? tipId : undefined}
        style={{
          all: 'unset', cursor: 'help', color: '#6b7280', fontSize: 11,
          lineHeight: 1, flexShrink: 0, borderRadius: 999,
        }}
      >
        ⓘ
      </button>
      {show && (
        <div
          id={tipId}
          role="tooltip"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', zIndex: 9999,
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            background: '#1a1a1a', border: '1px solid #2e2e3e', borderRadius: 8,
            padding: '10px 14px', minWidth: 220, maxWidth: 300,
            fontSize: 12, color: '#9ca3af', lineHeight: 1.6, textTransform: 'none',
            letterSpacing: 'normal', fontWeight: 400, textAlign: 'left',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)', pointerEvents: 'none',
          }}>
          {label && <div style={{ color: '#ebebeb', fontWeight: 600, marginBottom: 4 }}>{label}</div>}
          <div>{text}</div>
        </div>
      )}
    </span>
  )
}
