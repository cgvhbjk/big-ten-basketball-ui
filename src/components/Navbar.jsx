import { NavLink } from 'react-router-dom'
import { T } from '../styles/theme.js'

const LINKS = [
  { to: '/teams',   label: 'Teams'   },
  { to: '/players', label: 'Players' },
]

export default function Navbar() {
  return (
    <nav
      aria-label="Primary"
      style={{
        background:    T.bgDeep,
        borderBottom:  `1px solid ${T.border}`,
        padding:       '0 20px',
        display:       'flex',
        alignItems:    'center',
        gap:           16,
        height:        52,
        flexShrink:    0,
        position:      'sticky',
        top:           0,
        zIndex:        50,
      }}
    >
      {/* Brand mark — "B1G" is the Big Ten's own shorthand. (Previously read
          "IV", a leftover from the sibling Ivy app.) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        <div
          aria-hidden="true"
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em',
          }}
        >
          B1G
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          Big Ten Basketball
        </span>
      </div>

      <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0 }} aria-hidden="true" />

      {/* Navigation — scrolls horizontally rather than wrapping on narrow screens */}
      <div
        className="bt-scroll-x"
        style={{ display: 'flex', gap: 2, flex: 1, alignItems: 'center' }}
      >
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              padding:        '6px 13px',
              borderRadius:   7,
              fontSize:       13,
              fontWeight:     isActive ? 600 : 500,
              textDecoration: 'none',
              whiteSpace:     'nowrap',
              color:          isActive ? T.accentSoft : T.textLow,
              background:     isActive ? `${T.accent}1f` : 'transparent',
              boxShadow:      isActive ? `inset 0 -2px 0 ${T.accentLt}` : 'none',
              transition:     'color .15s, background .15s',
            })}
            // aria-current is set by NavLink automatically for the active route,
            // giving screen-reader users the "current page" announcement.
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right label — hidden on the narrowest screens to protect the nav */}
      <span
        style={{ fontSize: 11, color: T.textMin, flexShrink: 0, whiteSpace: 'nowrap' }}
        className="bt-hide-phone"
      >
        2022–2026 · Big Ten
      </span>
    </nav>
  )
}
