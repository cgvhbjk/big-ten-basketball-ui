import { T, TYPE } from '../../styles/theme.js'
import SectionTabs from './SectionTabs.jsx'

// Inverted-pyramid page header:
//   title    — large left heading (answers "where am I?")
//   subtitle — one line of context
//   stats    — array of { label, value, color?, note? } — the 5-second-rule KPIs
//   controls — optional right slot for selectors / toggles
//   tabs     — optional [{ value, label, badge? }]; renders an accessible
//              tablist in a consistent band below the KPIs. When provided,
//              also pass `activeTab` and `onTabChange`.
export default function PageHeader({
  title, subtitle, stats = [], controls,
  tabs, activeTab, onTabChange, tabsLabel = 'Sections',
}) {
  const hasStats = stats.length > 0
  return (
    <header
      style={{
        background:   T.surf,
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 24,
      }}
    >
      <div className="bt-page" style={{ paddingTop: 18, paddingBottom: hasStats ? 14 : 16 }}>
        {/* Top row: title + controls */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap', marginBottom: hasStats ? 16 : 0,
        }}>
          <div style={{ minWidth: 0 }}>
            {title && (
              <h1 style={{ ...TYPE.pageTitle, color: T.text, margin: 0 }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p style={{ fontSize: 12.5, color: T.textLow, margin: '4px 0 0', lineHeight: 1.5, maxWidth: 860 }}>
                {subtitle}
              </p>
            )}
          </div>
          {controls && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {controls}
            </div>
          )}
        </div>

        {/* KPI strip — the 5-second answer row. Each KPI is a self-contained
            block so it stays legible when the row wraps on small screens. */}
        {hasStats && (
          <div
            role="group"
            aria-label="Key metrics"
            style={{ display: 'flex', flexWrap: 'wrap', rowGap: 10, columnGap: 0 }}
          >
            {stats.map(({ label, value, color, note }, i) => (
              <div
                key={label}
                style={{
                  padding: '2px 18px',
                  borderLeft: i === 0 ? 'none' : `1px solid ${T.border}`,
                }}
              >
                <div style={{ ...TYPE.kpiValue, color: color ?? T.text }}>
                  {value ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: T.textLow, marginTop: 2 }}>{label}</div>
                {note && <div style={{ fontSize: 10, color: T.textMin, marginTop: 1 }}>{note}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Tab band */}
        {tabs?.length > 0 && (
          <div style={{ marginTop: hasStats ? 16 : 12 }}>
            <SectionTabs
              tabs={tabs}
              value={activeTab}
              onChange={onTabChange}
              ariaLabel={tabsLabel}
            />
          </div>
        )}
      </div>
    </header>
  )
}
