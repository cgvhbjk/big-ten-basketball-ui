import { useState, useRef, useEffect, useId } from 'react'
import { GLOSSARY } from '../../data/glossary.js'

export default function GlossaryTooltip({ metricKey, children, style: extraStyle }) {
  const [show, setShow] = useState(false)
  const entry = GLOSSARY[metricKey]
  const ref = useRef(null)
  const tipId = useId()

  useEffect(() => {
    if (!show) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false)
    }
    document.addEventListener('mousedown', handler)
    // Escape closes the tooltip for keyboard users
    function onKey(e) { if (e.key === 'Escape') setShow(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', onKey)
    }
  }, [show])

  if (!entry) return <span style={extraStyle}>{children}</span>

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3, ...extraStyle }}>
      {children}
      {/* Real <button> so the definition is reachable by keyboard (Tab + focus),
          not just mouse hover. Opens on hover OR focus; closes on blur/Escape. */}
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={() => setShow(s => !s)}
        aria-label={`Definition of ${entry.label}`}
        aria-expanded={show}
        aria-describedby={show ? tipId : undefined}
        style={{
          all: 'unset', cursor: 'help', color: '#6b7280', fontSize: 11, lineHeight: 1,
          flexShrink: 0, borderRadius: 999,
        }}
      >
        ⓘ
      </button>
      {show && (
        <div
          id={tipId}
          role="tooltip"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 9999,
            background: '#1a1a1a', border: '1px solid #2e2e3e', borderRadius: 8,
            padding: '10px 14px', minWidth: 240, maxWidth: 320,
            fontSize: 12, color: '#9ca3af', lineHeight: 1.6,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}>
          <div style={{ color: '#ebebeb', fontWeight: 600, marginBottom: 4 }}>{entry.label}</div>
          <div style={{ marginBottom: 8 }}>{entry.definition}</div>
          <div style={{ borderTop: '1px solid #2c2c2c', paddingTop: 6 }}>
            <span style={{ color: '#6b7280', fontSize: 11 }}>Calc: </span>
            <span style={{ color: '#9ca3af', fontSize: 11 }}>{entry.calc}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: '#6b7280' }}>
            {entry.type === 'derived' ? '⚡ Derived metric' : '📊 Raw stat'}
          </div>
        </div>
      )}
    </span>
  )
}
