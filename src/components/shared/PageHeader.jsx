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
//
// Condensing: when there's no title/subtitle (e.g. an embedded page), the KPI
// strip moves up into the heading row — sitting opposite the controls — so the
// header doesn't waste a blank row where the title would be.
export default function PageHeader({
  title, subtitle, stats = [], controls,
  tabs, activeTab, onTabChange, tabsLabel = 'Sections',
}) {
  const hasStats = stats.length > 0
  const hasHeading = Boolean(title || subtitle)
  const inlineStats = hasStats && !hasHeading

  const kpiStrip = (
    <div
      role="group"
      aria-label="Key metrics"
      style={{ display: 'flex', flexWrap: 'wrap', rowGap: 8, columnGap: 0, alignItems: 'baseline' }}
    >
      {stats.map(({ label, value, color, note }, i) => (
        <div
          key={label}
          style={{ padding: '2px 18px 2px', borderLeft: i === 0 ? 'none' : `1px solid ${T.border}` }}
        >
          <div style={{ ...TYPE.kpiValue, color: color ?? T.text }}>{value ?? '—'}</div>
          <div style={{ fontSize: 11, color: T.textLow, marginTop: 2 }}>{label}</div>
          {note && <div style={{ fontSize: 10, color: T.textMin, marginTop: 1 }}>{note}</div>}
        </div>
      ))}
    </div>
  )

  return (
    <header style={{ background: T.surf, borderBottom: `1px solid ${T.border}`, marginBottom: 24 }}>
      <div className="bt-page" style={{ paddingTop: 14, paddingBottom: 12 }}>
        {/* Heading row: title/subtitle OR (when none) the KPI strip, plus controls */}
        <div style={{
          display: 'flex',
          alignItems: inlineStats ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
          marginBottom: (hasStats && !inlineStats) || tabs?.length ? 12 : 0,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && (
              <h1 style={{ ...TYPE.pageTitle, color: T.text, margin: 0 }}>{title}</h1>
            )}
            {subtitle && (
              <p
                // One line, full available width; truncate with an ellipsis rather
                // than wrapping. Full text stays available on hover via title.
                title={typeof subtitle === 'string' ? subtitle : undefined}
                style={{
                  fontSize: 12.5, color: T.textLow, margin: title ? '4px 0 0' : 0, lineHeight: 1.5,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {subtitle}
              </p>
            )}
            {inlineStats && kpiStrip}
          </div>
          {controls && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {controls}
            </div>
          )}
        </div>

        {/* Separate KPI strip only when a heading occupied the row above */}
        {hasStats && !inlineStats && (
          <div style={{ marginBottom: tabs?.length ? 12 : 0 }}>{kpiStrip}</div>
        )}

        {/* Tab band */}
        {tabs?.length > 0 && (
          <SectionTabs tabs={tabs} value={activeTab} onChange={onTabChange} ariaLabel={tabsLabel} />
        )}
      </div>
    </header>
  )
}
